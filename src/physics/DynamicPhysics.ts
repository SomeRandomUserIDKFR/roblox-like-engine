import { Vector3 } from "three";
import type { Part } from "../instances/Part";
import type { Workspace } from "../instances/Workspace";
import { aabbOverlaps, type AABB } from "./AABB";
import type { CollisionWorld } from "./CollisionWorld";

const GRAVITY = 96;
const BOUNCE = 0.35;
const FRICTION = 0.88;

interface BodyState {
  part: Part;
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Simple rigid motion for unanchored parts (gravity + AABB vs static world).
 * Not a full constraint solver — enough for crates, debris, knockables.
 */
export class DynamicPhysics {
  private readonly bodies: BodyState[] = [];

  constructor(
    private readonly workspace: Workspace,
    private readonly collision: CollisionWorld,
  ) {
    this.rebuild();
  }

  rebuild() {
    this.bodies.length = 0;
    for (const part of this.workspace.parts) {
      if (part.anchored || part.destroyed || part.isRamp || part.isTestRig) {
        continue;
      }
      if (part.massless) continue;
      this.bodies.push({ part, vx: 0, vy: 0, vz: 0 });
    }
    this.refreshStaticColliders();
  }

  /** Static = anchored canCollide parts only. */
  refreshStaticColliders() {
    this.collision.clear();
    this.collision.addMany(this.staticBoxes());
    this.collision.addRamps(this.workspace.getRamps());
  }

  private staticBoxes(): AABB[] {
    return this.workspace.parts
      .filter(
        (p) =>
          p.anchored &&
          p.canCollide &&
          !p.isRamp &&
          !p.destroyed &&
          !p.isTestRig,
      )
      .map((p) => p.getAABB());
  }

  /** Anchored + current dynamic AABBs for player collision. */
  syncPlayerColliders() {
    this.collision.clear();
    this.collision.addMany(this.staticBoxes());
    for (const b of this.bodies) {
      if (b.part.destroyed || !b.part.canCollide) continue;
      this.collision.add(b.part.getAABB());
    }
    this.collision.addRamps(this.workspace.getRamps());
  }

  /** Impulse from sword / explosion, etc. */
  applyImpulse(part: Part, ix: number, iy: number, iz: number) {
    const b = this.bodies.find((x) => x.part === part);
    if (!b) return;
    const m = part.massless ? 0.1 : Math.max(0.2, part.size.x * part.size.y * part.size.z * 0.05);
    b.vx += ix / m;
    b.vy += iy / m;
    b.vz += iz / m;
  }

  update(dt: number, playerBody?: AABB | null) {
    if (this.bodies.length === 0) return;

    for (const b of this.bodies) {
      const p = b.part;
      if (p.destroyed) continue;

      b.vy -= GRAVITY * dt;
      p.position.x += b.vx * dt;
      p.position.y += b.vy * dt;
      p.position.z += b.vz * dt;

      // Resolve vs static solids
      const box = p.getAABB();
      for (const solid of this.collision.solids) {
        if (!aabbOverlaps(box, solid, 0)) continue;
        this.resolveAabb(b, solid);
      }

      // Soft push from player
      if (playerBody && aabbOverlaps(p.getAABB(), playerBody, 0)) {
        const cx = (playerBody.minX + playerBody.maxX) * 0.5;
        const cz = (playerBody.minZ + playerBody.maxZ) * 0.5;
        const dx = p.position.x - cx;
        const dz = p.position.z - cz;
        const len = Math.hypot(dx, dz) || 1;
        b.vx += (dx / len) * 8;
        b.vz += (dz / len) * 8;
        b.vy += 2;
      }

      // Floor clamp via ground sample
      const ground = this.collision.sampleGroundY(p.position.x, p.position.z, true);
      if (ground != null) {
        const feet = p.position.y - p.size.y * 0.5;
        if (feet < ground + 0.02 && b.vy <= 0) {
          p.position.y = ground + p.size.y * 0.5;
          if (p.bouncy && Math.abs(b.vy) > 2) {
            b.vy = -b.vy * Math.min(0.85, BOUNCE + 0.3);
          } else {
            b.vy = 0;
            b.vx *= FRICTION;
            b.vz *= FRICTION;
          }
        }
      }

      // Kill floor
      if (p.position.y < -200) {
        p.destroyed = true;
        p.mesh.visible = false;
      }

      p.sync();
    }
  }

  private resolveAabb(b: BodyState, solid: AABB) {
    const p = b.part;
    const box = p.getAABB();
    const overlapX = Math.min(box.maxX - solid.minX, solid.maxX - box.minX);
    const overlapY = Math.min(box.maxY - solid.minY, solid.maxY - box.minY);
    const overlapZ = Math.min(box.maxZ - solid.minZ, solid.maxZ - box.minZ);
    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return;

    if (overlapY <= overlapX && overlapY <= overlapZ) {
      const up = (box.minY + box.maxY) * 0.5 > (solid.minY + solid.maxY) * 0.5;
      p.position.y += up ? overlapY : -overlapY;
      if ((up && b.vy < 0) || (!up && b.vy > 0)) {
        b.vy = p.bouncy ? -b.vy * BOUNCE : 0;
      }
    } else if (overlapX <= overlapZ) {
      const right = (box.minX + box.maxX) * 0.5 > (solid.minX + solid.maxX) * 0.5;
      p.position.x += right ? overlapX : -overlapX;
      b.vx = p.bouncy ? -b.vx * BOUNCE : 0;
    } else {
      const fwd = (box.minZ + box.maxZ) * 0.5 > (solid.minZ + solid.maxZ) * 0.5;
      p.position.z += fwd ? overlapZ : -overlapZ;
      b.vz = p.bouncy ? -b.vz * BOUNCE : 0;
    }
  }

  getDynamicParts(): Part[] {
    return this.bodies.map((b) => b.part);
  }
}

/** Temp vector unused export for callers that need a zero. */
export const DYNAMIC_ZERO = new Vector3();

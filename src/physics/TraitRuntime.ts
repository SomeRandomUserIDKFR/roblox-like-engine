import { Vector3 } from "three";
import type { Part } from "../instances/Part";
import type { Workspace } from "../instances/Workspace";
import { GRAVITY, type PlayerMotor } from "../player/PlayerMotor";
import type { R6Character } from "../player/R6Character";
import { aabbOverlaps } from "./AABB";
import type { CollisionWorld } from "./CollisionWorld";

const MAG_RANGE = 28;
const MAG_STRENGTH = 55;
const WATER_GRAVITY_SCALE = 0.22;
const WATER_BUOYANCY = 48;
const BREAK_IMPACT = -38;
const SWORD_REACH = 6.5;

/**
 * Applies HedronX Part traits during PolyX play.
 */
export class TraitRuntime {
  private readonly tmp = new Vector3();
  private inWater = false;
  private shockCooldown = 0;

  constructor(
    private readonly workspace: Workspace,
    private readonly collision: CollisionWorld,
  ) {}

  get submerged() {
    return this.inWater;
  }

  rebuildCollision() {
    this.collision.clear();
    this.collision.addMany(
      this.workspace.parts
        .filter(
          (p) =>
            p.anchored &&
            p.canCollide &&
            !p.isRamp &&
            !p.destroyed &&
            !p.isTestRig,
        )
        .map((p) => p.getAABB()),
    );
    // Include unanchored at current pose so player can stand on crates
    for (const p of this.workspace.parts) {
      if (
        !p.anchored &&
        p.canCollide &&
        !p.destroyed &&
        !p.isRamp &&
        !p.isTestRig
      ) {
        this.collision.add(p.getAABB());
      }
    }
    this.collision.addRamps(this.workspace.getRamps());
  }

  sampleSupport(character: R6Character): Part | null {
    const p = character.root.position;
    const feetY = p.y - 2.5;
    let best: Part | null = null;
    let bestTop = -Infinity;
    for (const part of this.workspace.parts) {
      if (part.destroyed || !part.canCollide || part.isWater) continue;
      const box = part.getAABB();
      if (
        p.x < box.minX - 0.05 ||
        p.x > box.maxX + 0.05 ||
        p.z < box.minZ - 0.05 ||
        p.z > box.maxZ + 0.05
      ) {
        continue;
      }
      if (box.maxY > feetY - 0.35 && box.maxY < p.y + 0.5 && box.maxY > bestTop) {
        bestTop = box.maxY;
        best = part;
      }
    }
    return best;
  }

  surfaceMoveRates(support: Part | null): {
    moveSmooth: number;
    stopSmooth: number;
    speedScale: number;
  } {
    if (!support) {
      return { moveSmooth: 150, stopSmooth: 120, speedScale: 1 };
    }
    if (support.slippery) {
      return { moveSmooth: 28, stopSmooth: 4, speedScale: 1.15 };
    }
    if (support.absorbent) {
      return { moveSmooth: 220, stopSmooth: 280, speedScale: 0.72 };
    }
    return { moveSmooth: 150, stopSmooth: 120, speedScale: 1 };
  }

  applyAfterIntegrate(
    dt: number,
    motor: PlayerMotor,
    character: R6Character,
    support: Part | null,
    wasGrounded: boolean,
    prevVy: number,
    swordHitActive: boolean,
  ) {
    this.shockCooldown = Math.max(0, this.shockCooldown - dt);
    this.applyBounce(motor, support, wasGrounded, prevVy);
    this.applyWater(dt, motor, character);
    this.applyBuoyantAids(dt, motor, character);
    this.applyMagnetic(dt, motor, character);
    this.applyConductive(motor, character, support);
    this.applyBreakable(motor, character, support, prevVy, swordHitActive);
  }

  private applyBounce(
    motor: PlayerMotor,
    support: Part | null,
    wasGrounded: boolean,
    prevVy: number,
  ) {
    if (!support?.bouncy) return;
    if (!wasGrounded && motor.grounded && prevVy < -6) {
      motor.velocityY = Math.min(42, Math.abs(prevVy) * 0.85);
      motor.grounded = false;
    }
  }

  private bodyBox(character: R6Character) {
    const p = character.root.position;
    return {
      minX: p.x - 1,
      maxX: p.x + 1,
      minY: p.y - 2.6,
      maxY: p.y + 2.2,
      minZ: p.z - 1,
      maxZ: p.z + 1,
    };
  }

  private applyWater(dt: number, motor: PlayerMotor, character: R6Character) {
    const body = this.bodyBox(character);
    let water: Part | null = null;
    for (const part of this.workspace.parts) {
      if (part.destroyed || !part.isWater) continue;
      if (aabbOverlaps(body, part.getAABB(), 0.05)) {
        water = part;
        break;
      }
    }
    this.inWater = !!water;
    if (!water) return;

    // Undo full gravity for this frame, apply water gravity + buoyancy
    motor.velocityY += GRAVITY * dt;
    motor.velocityY -= GRAVITY * WATER_GRAVITY_SCALE * dt;
    motor.velocityY += WATER_BUOYANCY * dt;

    motor.velocity.x *= Math.exp(-2.2 * dt);
    motor.velocity.z *= Math.exp(-2.2 * dt);
    motor.velocityY *= Math.exp(-1.4 * dt);

    const wish = motor.getWishVelocity();
    if (wish.lengthSq() > 0.01) {
      motor.velocity.x += wish.x * 0.12;
      motor.velocity.z += wish.z * 0.12;
    }
    // Hold Space to swim up
    void character;
  }

  private applyBuoyantAids(
    dt: number,
    motor: PlayerMotor,
    character: R6Character,
  ) {
    if (!this.inWater) return;
    const body = this.bodyBox(character);
    for (const part of this.workspace.parts) {
      if (part.destroyed || !part.buoyant) continue;
      if (!aabbOverlaps(body, part.getAABB(), 0.1)) continue;
      motor.velocityY += 70 * dt;
    }
  }

  private applyMagnetic(
    dt: number,
    motor: PlayerMotor,
    character: R6Character,
  ) {
    const p = character.root.position;
    for (const part of this.workspace.parts) {
      if (part.destroyed || !part.magnetic) continue;
      if (!part.magneticPull && !part.magneticPush) continue;

      this.tmp.set(
        part.position.x - p.x,
        part.position.y - p.y,
        part.position.z - p.z,
      );
      const dist = this.tmp.length();
      if (dist < 0.4 || dist > MAG_RANGE) continue;
      this.tmp.multiplyScalar(1 / dist);
      const falloff = 1 - dist / MAG_RANGE;
      const accel = MAG_STRENGTH * falloff * falloff * dt;

      if (part.magneticPull) {
        motor.velocity.x += this.tmp.x * accel;
        motor.velocity.z += this.tmp.z * accel;
        motor.velocityY += this.tmp.y * accel * 0.55;
      }
      if (part.magneticPush) {
        motor.velocity.x -= this.tmp.x * accel;
        motor.velocity.z -= this.tmp.z * accel;
        motor.velocityY -= this.tmp.y * accel * 0.55;
      }
    }
  }

  private applyConductive(
    motor: PlayerMotor,
    character: R6Character,
    support: Part | null,
  ) {
    if (this.shockCooldown > 0) return;
    const body = this.bodyBox(character);
    const touchingConductive = this.workspace.parts.some(
      (part) =>
        !part.destroyed &&
        part.conductive &&
        aabbOverlaps(body, part.getAABB(), 0.05),
    );

    if (this.inWater && touchingConductive) {
      motor.velocityY = Math.max(motor.velocityY, 28);
      motor.velocity.x *= -0.4;
      motor.velocity.z *= -0.4;
      this.shockCooldown = 0.85;
      return;
    }

    if (support?.conductive) {
      motor.velocity.x *= 1.035;
      motor.velocity.z *= 1.035;
    }
  }

  private applyBreakable(
    _motor: PlayerMotor,
    character: R6Character,
    support: Part | null,
    prevVy: number,
    swordHitActive: boolean,
  ) {
    let broke = false;

    if (
      support?.breakable &&
      support.name !== "Baseplate" &&
      prevVy < BREAK_IMPACT
    ) {
      if (support.breakApart()) broke = true;
    }

    if (swordHitActive) {
      const p = character.root.position;
      const facing = character.root.rotation.y;
      const fx = Math.sin(facing);
      const fz = Math.cos(facing);
      for (const part of this.workspace.parts) {
        if (part.destroyed || !part.breakable) continue;
        if (part.name === "Baseplate") continue;
        const dx = part.position.x - p.x;
        const dz = part.position.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > SWORD_REACH) continue;
        if (dx * fx + dz * fz < 0.1) continue;
        if (part.breakApart()) broke = true;
      }
    }

    if (broke) this.rebuildCollision();
  }
}

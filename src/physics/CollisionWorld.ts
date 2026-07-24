import { Vector3 } from "three";
import { aabbOverlaps, type AABB } from "./AABB";
import { rampHeightAt, type RampSolid } from "./Ramp";

/** Player hitbox relative to RootPart (torso center). */
export interface CharacterCollider {
  halfX: number;
  halfZ: number;
  /** Feet Y − root Y (negative). */
  bottom: number;
  /** Head top Y − root Y (positive). */
  top: number;
}

export interface MoveCollideResult {
  grounded: boolean;
  /** World Y of the surface under the feet when grounded. */
  floorY: number;
}

const SKIN = 1e-3;
const GROUND_SNAP = 0.12;
/** Max auto step-up height (studs) — Roblox-like walk onto stairs/ledges. */
export const STEP_HEIGHT = 1.75;
/** How far above a slope we still stick while walking. */
const SLOPE_STICK = 1.85;
/** Max separation speed from rotate/overlap resolve (studs/s). */
const MAX_SEP_SPEED = 4;
/** How strongly we keep last push normal (stops flicker at corners). */
const NORMAL_STICK = 0.75;

/**
 * Static AABB solids + walkable ramps. Axis sweeps + ground sampling.
 */
export class CollisionWorld {
  readonly solids: AABB[] = [];
  readonly ramps: RampSolid[] = [];

  /** Smoothed separation normal (XZ) — avoids flip-flop at corners. */
  private sepNx = 0;
  private sepNz = -1;
  private hasSepN = false;

  clear() {
    this.solids.length = 0;
    this.ramps.length = 0;
  }

  add(box: AABB) {
    this.solids.push(box);
  }

  addMany(boxes: AABB[]) {
    this.solids.push(...boxes);
  }

  addRamp(ramp: RampSolid) {
    this.ramps.push(ramp);
  }

  addRamps(ramps: RampSolid[]) {
    this.ramps.push(...ramps);
  }

  bodyAt(root: Vector3, c: CharacterCollider): AABB {
    return {
      minX: root.x - c.halfX,
      maxX: root.x + c.halfX,
      minY: root.y + c.bottom,
      maxY: root.y + c.top,
      minZ: root.z - c.halfZ,
      maxZ: root.z + c.halfZ,
    };
  }

  /** Highest walkable surface under (x,z), or null. */
  sampleGroundY(x: number, z: number, walkableOnly = true): number | null {
    let best: number | null = null;

    for (const solid of this.solids) {
      if (
        x < solid.minX - SKIN ||
        x > solid.maxX + SKIN ||
        z < solid.minZ - SKIN ||
        z > solid.maxZ + SKIN
      ) {
        continue;
      }
      if (best === null || solid.maxY > best) best = solid.maxY;
    }

    for (const ramp of this.ramps) {
      if (walkableOnly && !ramp.walkable) continue;
      const h = rampHeightAt(ramp, x, z);
      if (h === null) continue;
      if (best === null || h > best) best = h;
    }

    return best;
  }

  /**
   * Highest surface under the character footprint (center + ring), so angled
   * approaches still catch the ramp instead of phasing through.
   */
  highestUnderBody(root: Vector3, c: CharacterCollider): number | null {
    const hx = c.halfX * 0.9;
    const hz = c.halfZ * 0.9;
    const pts: [number, number][] = [
      [root.x, root.z],
      [root.x + hx, root.z],
      [root.x - hx, root.z],
      [root.x, root.z + hz],
      [root.x, root.z - hz],
      [root.x + hx * 0.7, root.z + hz * 0.7],
      [root.x + hx * 0.7, root.z - hz * 0.7],
      [root.x - hx * 0.7, root.z + hz * 0.7],
      [root.x - hx * 0.7, root.z - hz * 0.7],
    ];
    let best: number | null = null;
    for (const [x, z] of pts) {
      const h = this.sampleGroundY(x, z, true);
      if (h !== null && (best === null || h > best)) best = h;
    }
    return best;
  }

  moveAndCollide(
    root: Vector3,
    velocity: Vector3,
    velocityY: { value: number },
    dt: number,
    collider: CharacterCollider,
    _facing = 0,
    wasGrounded = false,
  ): MoveCollideResult {
    const canStep = wasGrounded && velocityY.value <= 0.15;
    let stepped = false;
    // While moving upward (e.g. just after a jump) the feet are still level
    // with the ground for a frame. Ground-stick passes must only un-phase
    // (push up out of solids), never snap back down — otherwise they cancel
    // the jump's upward velocity before the body can rise.
    const ascending = velocityY.value > 0;

    const dx = velocity.x * dt;
    if (dx !== 0) {
      const x0 = root.x;
      const y0 = root.y;
      const z0 = root.z;
      root.x += dx;
      if (this.clampAxis(root, collider, "x", Math.sign(dx))) {
        if (canStep && this.tryStepUp(root, collider, x0, y0, z0, dx, 0)) {
          stepped = true;
          velocityY.value = 0;
        } else {
          velocity.x = 0;
        }
      }
      // Catch ramps after X even if not previously grounded (angle clip)
      if (this.supportOnSurface(root, collider, wasGrounded || stepped, ascending)) {
        velocityY.value = 0;
        stepped = true;
      }
    }

    const dz = velocity.z * dt;
    if (dz !== 0) {
      const x0 = root.x;
      const y0 = root.y;
      const z0 = root.z;
      root.z += dz;
      if (this.clampAxis(root, collider, "z", Math.sign(dz))) {
        if (canStep && this.tryStepUp(root, collider, x0, y0, z0, 0, dz)) {
          stepped = true;
          velocityY.value = 0;
        } else {
          velocity.z = 0;
        }
      }
      if (this.supportOnSurface(root, collider, wasGrounded || stepped, ascending)) {
        velocityY.value = 0;
        stepped = true;
      }
    }

    // Stick / un-phase while walking
    if (this.supportOnSurface(root, collider, wasGrounded || stepped, ascending)) {
      velocityY.value = 0;
      stepped = true;
    }

    const dy = velocityY.value * dt;
    let hitFloor = stepped;
    let hitCeil = false;
    if (dy !== 0) {
      const feetBefore = root.y + collider.bottom;
      root.y += dy;
      const yHit = this.clampAxis(root, collider, "y", Math.sign(dy));
      if (yHit === "floor") {
        velocityY.value = 0;
        hitFloor = true;
      } else if (yHit === "ceiling") {
        velocityY.value = 0;
        hitCeil = true;
      }
      // Crossed or landed on a ramp while falling / moving down
      if (!hitFloor && velocityY.value <= 0) {
        const surface = this.highestUnderBody(root, collider);
        if (surface !== null) {
          const feet = root.y + collider.bottom;
          if (feetBefore >= surface - SKIN && feet <= surface + SKIN) {
            root.y = surface - collider.bottom;
            velocityY.value = 0;
            hitFloor = true;
          } else if (feet < surface - SKIN && surface - feet < 3.5) {
            // Phased under the slab — push back onto it
            root.y = surface - collider.bottom;
            velocityY.value = 0;
            hitFloor = true;
          }
        }
      }
    }

    const sep = this.separateOutward(root, collider, dt);
    if (sep.hitX) velocity.x = 0;
    if (sep.hitZ) velocity.z = 0;

    // Final anti-phase pass — still only push up (not snap down) while rising
    if (this.supportOnSurface(root, collider, true, velocityY.value > 0)) {
      velocityY.value = 0;
      hitFloor = true;
    }

    let grounded = hitFloor;
    let floorY = grounded ? root.y + collider.bottom : 0;

    if (!grounded && !hitCeil && velocityY.value <= 0) {
      const snap = this.tryGroundSnap(root, collider, GROUND_SNAP);
      if (snap !== null) {
        root.y = snap - collider.bottom;
        velocityY.value = 0;
        grounded = true;
        floorY = snap;
      }
    } else if (grounded) {
      floorY = root.y + collider.bottom;
    }

    return { grounded, floorY };
  }

  /**
   * Keep feet on ground/ramps. Always pushes up if under the surface (phase fix);
   * also sticks down when walking or within snap range.
   */
  private supportOnSurface(
    root: Vector3,
    c: CharacterCollider,
    allowStickDown: boolean,
    penetrationOnly: boolean,
  ): boolean {
    const surface = this.highestUnderBody(root, c);
    if (surface === null) return false;
    const feet = root.y + c.bottom;
    const gap = feet - surface; // >0 above, <0 through

    if (gap < -SKIN && -gap < 4) {
      // Through the ramp / slope — always push up
      root.y = surface - c.bottom;
      return true;
    }

    if (penetrationOnly) return false;

    const maxDown = allowStickDown ? SLOPE_STICK : GROUND_SNAP;
    if (gap >= -SKIN && gap <= maxDown) {
      root.y = surface - c.bottom;
      return true;
    }
    return false;
  }

  /**
   * From a blocked horizontal move: lift, retry move, snap onto a surface
   * within STEP_HEIGHT. Restores pose and returns false on failure.
   */
  private tryStepUp(
    root: Vector3,
    c: CharacterCollider,
    xBefore: number,
    yBefore: number,
    zBefore: number,
    dx: number,
    dz: number,
  ): boolean {
    root.x = xBefore;
    root.z = zBefore;
    root.y = yBefore + STEP_HEIGHT;

    if (this.hardOverlaps(root, c)) {
      root.x = xBefore;
      root.y = yBefore;
      root.z = zBefore;
      if (dx !== 0) {
        root.x += dx;
        this.clampAxis(root, c, "x", Math.sign(dx));
      }
      if (dz !== 0) {
        root.z += dz;
        this.clampAxis(root, c, "z", Math.sign(dz));
      }
      return false;
    }

    if (dx !== 0) {
      root.x += dx;
      if (this.clampAxis(root, c, "x", Math.sign(dx))) {
        root.x = xBefore;
        root.y = yBefore;
        root.z = zBefore;
        root.x += dx;
        this.clampAxis(root, c, "x", Math.sign(dx));
        return false;
      }
    }
    if (dz !== 0) {
      root.z += dz;
      if (this.clampAxis(root, c, "z", Math.sign(dz))) {
        root.x = xBefore;
        root.y = yBefore;
        root.z = zBefore;
        root.z += dz;
        this.clampAxis(root, c, "z", Math.sign(dz));
        return false;
      }
    }

    const feetMin = yBefore + c.bottom + 0.02;
    const feetMax = yBefore + c.bottom + STEP_HEIGHT + 0.05;
    const floor = this.findFloorInRange(root, c, feetMin, feetMax);
    if (floor === null) {
      root.x = xBefore;
      root.y = yBefore;
      root.z = zBefore;
      if (dx !== 0) {
        root.x += dx;
        this.clampAxis(root, c, "x", Math.sign(dx));
      }
      if (dz !== 0) {
        root.z += dz;
        this.clampAxis(root, c, "z", Math.sign(dz));
      }
      return false;
    }

    root.y = floor - c.bottom;
    return true;
  }

  private hardOverlaps(root: Vector3, c: CharacterCollider): boolean {
    const body = this.bodyAt(root, c);
    for (const solid of this.solids) {
      if (!aabbOverlaps(body, solid, SKIN)) continue;
      const penL = body.maxX - solid.minX;
      const penR = solid.maxX - body.minX;
      const penD = body.maxY - solid.minY;
      const penU = solid.maxY - body.minY;
      const penN = body.maxZ - solid.minZ;
      const penP = solid.maxZ - body.minZ;
      if (
        penL > 0 &&
        penR > 0 &&
        penD > 0 &&
        penU > 0 &&
        penN > 0 &&
        penP > 0
      ) {
        return true;
      }
    }
    return false;
  }

  private findFloorInRange(
    root: Vector3,
    c: CharacterCollider,
    minTop: number,
    maxTop: number,
  ): number | null {
    const body = this.bodyAt(root, c);
    let best: number | null = null;
    for (const solid of this.solids) {
      if (
        body.minX >= solid.maxX - SKIN ||
        body.maxX <= solid.minX + SKIN ||
        body.minZ >= solid.maxZ - SKIN ||
        body.maxZ <= solid.minZ + SKIN
      ) {
        continue;
      }
      const top = solid.maxY;
      if (top >= minTop && top <= maxTop) {
        if (best === null || top > best) best = top;
      }
    }
    const g = this.sampleGroundY(root.x, root.z, true);
    if (g !== null && g >= minTop && g <= maxTop) {
      if (best === null || g > best) best = g;
    }
    return best;
  }

  private clampAxis(
    root: Vector3,
    c: CharacterCollider,
    axis: "x" | "y" | "z",
    _dir: number,
  ): boolean | "floor" | "ceiling" {
    let hit: boolean | "floor" | "ceiling" = false;
    let bestX = root.x;
    let bestY = root.y;
    let bestZ = root.z;
    let found = false;
    let bestAbs = Infinity;

    // Only resolve this axis when it's the shallowest overlap (MTV).
    // Exit via nearest face on that axis — never by move direction (that
    // teleports you across the box when already overlapping past center).
    const MTV_SLACK = 0.02;

    for (const solid of this.solids) {
      const body = this.bodyAt(root, c);
      if (!aabbOverlaps(body, solid, SKIN)) continue;

      const penL = body.maxX - solid.minX;
      const penR = solid.maxX - body.minX;
      const penD = body.maxY - solid.minY;
      const penU = solid.maxY - body.minY;
      const penN = body.maxZ - solid.minZ;
      const penP = solid.maxZ - body.minZ;
      const penX = Math.min(penL, penR);
      const penY = Math.min(penD, penU);
      const penZ = Math.min(penN, penP);
      if (penX <= 0 || penY <= 0 || penZ <= 0) continue;

      const minPen = Math.min(penX, penY, penZ);
      const axisPen = axis === "x" ? penX : axis === "y" ? penY : penZ;
      if (axisPen > minPen + MTV_SLACK) continue;

      if (axis === "x") {
        const x =
          penL < penR ? root.x - penL - SKIN : root.x + penR + SKIN;
        const abs = Math.abs(x - root.x);
        if (!found || abs < bestAbs) {
          bestX = x;
          bestAbs = abs;
          found = true;
        }
        hit = true;
      } else if (axis === "z") {
        const z =
          penN < penP ? root.z - penN - SKIN : root.z + penP + SKIN;
        const abs = Math.abs(z - root.z);
        if (!found || abs < bestAbs) {
          bestZ = z;
          bestAbs = abs;
          found = true;
        }
        hit = true;
      } else if (penD < penU) {
        const y = root.y - penD - SKIN;
        const abs = Math.abs(y - root.y);
        if (!found || abs < bestAbs) {
          bestY = y;
          bestAbs = abs;
          found = true;
        }
        hit = "ceiling";
      } else {
        const y = root.y + penU + SKIN;
        const abs = Math.abs(y - root.y);
        if (!found || abs < bestAbs) {
          bestY = y;
          bestAbs = abs;
          found = true;
        }
        hit = "floor";
      }
    }

    if (found) {
      if (axis === "x") root.x = bestX;
      else if (axis === "z") root.z = bestZ;
      else root.y = bestY;
    }

    return hit;
  }

  /**
   * Residual XZ overlap. Uses nearest-face pushes but ignores shallow
   * side-lips at corners so sliding an edge doesn't walk you around it.
   */
  private separateOutward(
    root: Vector3,
    c: CharacterCollider,
    dt: number,
  ) {
    let hitX = false;
    let hitZ = false;

    let sumX = 0;
    let sumZ = 0;
    let contacts = 0;

    const body = this.bodyAt(root, c);
    /** Shallow overlaps on a secondary face while sliding — ignore. */
    const CORNER_LIP = 0.14;

    for (const solid of this.solids) {
      if (!aabbOverlaps(body, solid, 0)) continue;

      const penL = body.maxX - solid.minX;
      const penR = solid.maxX - body.minX;
      const penD = body.maxY - solid.minY;
      const penU = solid.maxY - body.minY;
      const penN = body.maxZ - solid.minZ;
      const penP = solid.maxZ - body.minZ;
      if (
        penL <= 0 ||
        penR <= 0 ||
        penD <= 0 ||
        penU <= 0 ||
        penN <= 0 ||
        penP <= 0
      ) {
        continue;
      }

      const faces: { pen: number; nx: number; nz: number }[] = [
        { pen: penL, nx: -1, nz: 0 },
        { pen: penR, nx: 1, nz: 0 },
        { pen: penN, nx: 0, nz: -1 },
        { pen: penP, nx: 0, nz: 1 },
      ];
      let best = faces[0];
      for (let i = 1; i < faces.length; i++) {
        if (faces[i].pen < best.pen) best = faces[i];
      }

      // Prefer sticky wall: don't switch to a nearly-orthogonal face for a lip
      if (this.hasSepN) {
        const align = best.nx * this.sepNx + best.nz * this.sepNz;
        if (align < 0.5 && best.pen < CORNER_LIP) {
          if (Math.abs(this.sepNx) >= Math.abs(this.sepNz)) {
            const p = this.sepNx < 0 ? penL : penR;
            if (p > SKIN) {
              best = {
                pen: p,
                nx: this.sepNx < 0 ? -1 : 1,
                nz: 0,
              };
            } else if (best.pen < CORNER_LIP) {
              continue;
            }
          } else {
            const p = this.sepNz < 0 ? penN : penP;
            if (p > SKIN) {
              best = {
                pen: p,
                nx: 0,
                nz: this.sepNz < 0 ? -1 : 1,
              };
            } else if (best.pen < CORNER_LIP) {
              continue;
            }
          }
        }
      } else if (best.pen < CORNER_LIP * 0.5) {
        continue;
      }

      sumX += best.nx * (best.pen + SKIN);
      sumZ += best.nz * (best.pen + SKIN);
      contacts++;
    }

    if (contacts === 0) {
      this.hasSepN = false;
      return { hitX, hitZ, floor: false, ceiling: false };
    }

    let mag = Math.hypot(sumX, sumZ);
    if (mag < 1e-8) {
      return { hitX, hitZ, floor: false, ceiling: false };
    }

    let nx = sumX / mag;
    let nz = sumZ / mag;

    if (this.hasSepN) {
      const dot = nx * this.sepNx + nz * this.sepNz;
      if (dot > 0) {
        nx = this.sepNx * NORMAL_STICK + nx * (1 - NORMAL_STICK);
        nz = this.sepNz * NORMAL_STICK + nz * (1 - NORMAL_STICK);
        const nlen = Math.hypot(nx, nz);
        if (nlen > 1e-8) {
          nx /= nlen;
          nz /= nlen;
        }
      }
    }
    this.sepNx = nx;
    this.sepNz = nz;
    this.hasSepN = true;

    const along = Math.max(0, sumX * nx + sumZ * nz);
    const step = Math.min(along, MAX_SEP_SPEED * Math.max(dt, 1 / 120));
    if (step > SKIN) {
      root.x += nx * step;
      root.z += nz * step;
      hitX = Math.abs(nx) > 0.01;
      hitZ = Math.abs(nz) > 0.01;
    }

    return { hitX, hitZ, floor: false, ceiling: false };
  }

  private tryGroundSnap(
    root: Vector3,
    c: CharacterCollider,
    maxGap = GROUND_SNAP,
  ): number | null {
    const feetY = root.y + c.bottom;
    let best: number | null = null;

    for (const solid of this.solids) {
      const body = this.bodyAt(root, c);
      if (
        body.minX >= solid.maxX - SKIN ||
        body.maxX <= solid.minX + SKIN ||
        body.minZ >= solid.maxZ - SKIN ||
        body.maxZ <= solid.minZ + SKIN
      ) {
        continue;
      }

      const top = solid.maxY;
      const gap = feetY - top;
      if (gap >= -SKIN && gap <= maxGap) {
        if (best === null || top > best) best = top;
      }
    }

    const rampY = this.sampleGroundY(root.x, root.z, true);
    if (rampY !== null) {
      const gap = feetY - rampY;
      if (gap >= -SKIN && gap <= maxGap) {
        if (best === null || rampY > best) best = rampY;
      }
    }

    return best;
  }
}

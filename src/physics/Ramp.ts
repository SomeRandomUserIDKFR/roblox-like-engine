/**
 * Walkable ramp / slope — height field over a yaw-aligned rectangle in XZ.
 * y rises from y0 (low end) to y1 along the slope direction.
 */
export interface RampSolid {
  /** Low-end center XZ */
  ox: number;
  oz: number;
  /** Unit direction up the slope (horizontal). */
  dirX: number;
  dirZ: number;
  /** Unit side axis (perpendicular in XZ). */
  sideX: number;
  sideZ: number;
  width: number;
  /** Horizontal length of the ramp footprint. */
  length: number;
  y0: number;
  y1: number;
  /** If false, surface won't keep the player grounded (too steep). */
  walkable: boolean;
}

/** Max walkable grade (rise / run). ~55°. */
export const MAX_WALK_GRADE = Math.tan((55 * Math.PI) / 180);

export function createRampSolid(
  ox: number,
  oz: number,
  y0: number,
  width: number,
  length: number,
  rise: number,
  yaw: number,
): RampSolid {
  const dirX = Math.sin(yaw);
  const dirZ = Math.cos(yaw);
  const sideX = Math.cos(yaw);
  const sideZ = -Math.sin(yaw);
  const grade = length > 1e-6 ? Math.abs(rise) / length : Infinity;
  return {
    ox,
    oz,
    dirX,
    dirZ,
    sideX,
    sideZ,
    width,
    length,
    y0,
    y1: y0 + rise,
    walkable: grade <= MAX_WALK_GRADE + 1e-6,
  };
}

/** Surface Y at (x,z), or null if outside the ramp footprint. */
export function rampHeightAt(
  ramp: RampSolid,
  x: number,
  z: number,
  pad = 0.2,
): number | null {
  const dx = x - ramp.ox;
  const dz = z - ramp.oz;
  const along = dx * ramp.dirX + dz * ramp.dirZ;
  const across = dx * ramp.sideX + dz * ramp.sideZ;
  if (along < -pad || along > ramp.length + pad) return null;
  if (Math.abs(across) > ramp.width * 0.5 + pad) return null;
  const clampedAlong = Math.min(Math.max(along, 0), ramp.length);
  const t = ramp.length > 1e-6 ? clampedAlong / ramp.length : 0;
  return ramp.y0 + t * (ramp.y1 - ramp.y0);
}

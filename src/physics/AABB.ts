/** Axis-aligned bounding box in world space. */
export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function aabb(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): AABB {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Box centered at (cx, cy, cz) with full size (sx, sy, sz). */
export function aabbFromCenter(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): AABB {
  const hx = sx * 0.5;
  const hy = sy * 0.5;
  const hz = sz * 0.5;
  return aabb(cx - hx, cy - hy, cz - hz, cx + hx, cy + hy, cz + hz);
}

export function aabbOverlaps(a: AABB, b: AABB, eps = 0): boolean {
  return (
    a.minX < b.maxX - eps &&
    a.maxX > b.minX + eps &&
    a.minY < b.maxY - eps &&
    a.maxY > b.minY + eps &&
    a.minZ < b.maxZ - eps &&
    a.maxZ > b.minZ + eps
  );
}

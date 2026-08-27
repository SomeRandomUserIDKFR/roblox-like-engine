import { Vector3 } from "three";
import type { Part } from "../instances/Part";
import type { Workspace } from "../instances/Workspace";
import { isUnderTool } from "../instances/Tool";
import { isUnderViewportFrame } from "../instances/Gui";

export interface RaycastParams {
  FilterDescendantsInstances?: unknown[];
  FilterType?: "Exclude" | "Include";
  IgnoreWater?: boolean;
}

export interface RaycastResult {
  Instance: Part;
  Position: { x: number; y: number; z: number };
  Normal: { x: number; y: number; z: number };
  Distance: number;
}

/**
 * Simple AABB slab raycast against workspace parts (canQuery).
 */
export function workspaceRaycast(
  workspace: Workspace,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance = 500,
  params?: RaycastParams,
): RaycastResult | null {
  const ox = origin.x;
  const oy = origin.y;
  const oz = origin.z;
  let dx = direction.x;
  let dy = direction.y;
  let dz = direction.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  dx /= len;
  dy /= len;
  dz /= len;

  let best: RaycastResult | null = null;
  let bestT = maxDistance;

  for (const part of workspace.parts) {
    if (!part.canQuery || part.destroyed || part.isTestRig) continue;
    if (isUnderTool(part) || isUnderViewportFrame(part)) continue;
    if (params?.IgnoreWater && part.isWater) continue;

    const hit = rayAabb(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      part.getAABB(),
      bestT,
    );
    if (!hit) continue;
    if (hit.t >= bestT) continue;
    bestT = hit.t;
    best = {
      Instance: part,
      Position: {
        x: ox + dx * hit.t,
        y: oy + dy * hit.t,
        z: oz + dz * hit.t,
      },
      Normal: hit.normal,
      Distance: hit.t,
    };
  }

  return best;
}

function rayAabb(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
  maxT: number,
): { t: number; normal: { x: number; y: number; z: number } } | null {
  const invX = dx !== 0 ? 1 / dx : 1e12;
  const invY = dy !== 0 ? 1 / dy : 1e12;
  const invZ = dz !== 0 ? 1 / dz : 1e12;

  let t1 = (box.minX - ox) * invX;
  let t2 = (box.maxX - ox) * invX;
  let t3 = (box.minY - oy) * invY;
  let t4 = (box.maxY - oy) * invY;
  let t5 = (box.minZ - oz) * invZ;
  let t6 = (box.maxZ - oz) * invZ;

  const tmin = Math.max(
    Math.min(t1, t2),
    Math.min(t3, t4),
    Math.min(t5, t6),
  );
  const tmax = Math.min(
    Math.max(t1, t2),
    Math.max(t3, t4),
    Math.max(t5, t6),
  );

  if (tmax < 0 || tmin > tmax || tmin > maxT) return null;
  const t = tmin >= 0 ? tmin : tmax;
  if (t < 0 || t > maxT) return null;

  // Approximate normal from which slab
  let normal = { x: 0, y: 1, z: 0 };
  const eps = 1e-4;
  if (Math.abs(t - Math.min(t1, t2)) < eps) normal = { x: t1 < t2 ? -1 : 1, y: 0, z: 0 };
  else if (Math.abs(t - Math.min(t3, t4)) < eps) normal = { x: 0, y: t3 < t4 ? -1 : 1, z: 0 };
  else if (Math.abs(t - Math.min(t5, t6)) < eps) normal = { x: 0, y: 0, z: t5 < t6 ? -1 : 1 };

  return { t, normal };
}

export function makeRaycastApi(workspace: Workspace) {
  return (
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxDistance?: number,
    params?: RaycastParams,
  ) => workspaceRaycast(workspace, origin, direction, maxDistance ?? 500, params);
}

/** Unused Vector3 keep for future Three integration. */
void Vector3;

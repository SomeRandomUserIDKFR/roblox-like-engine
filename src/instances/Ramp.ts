import { makePart, type Part } from "./Part";
import type { Workspace } from "./Workspace";
import { createRampSolid, type RampSolid } from "../physics/Ramp";

export type RampInstance = {
  part: Part;
  solid: RampSolid;
};

/**
 * Place a visual ramp Part + walkable RampSolid.
 * Low end at (ox, yLow, oz); climbs `rise` over horizontal `length` toward `yaw`.
 */
export function makeRamp(
  workspace: Workspace,
  name: string,
  ox: number,
  yLow: number,
  oz: number,
  width: number,
  length: number,
  rise: number,
  yaw: number,
  color: number,
): RampInstance {
  const solid = createRampSolid(ox, oz, yLow, width, length, rise, yaw);
  const slopeLen = Math.hypot(length, rise);
  const pitch = -Math.atan2(rise, length);
  const thickness = 0.32;
  const cx = ox + solid.dirX * (length * 0.5);
  const cz = oz + solid.dirZ * (length * 0.5);
  const cy = (solid.y0 + solid.y1) * 0.5;

  const part = makePart(name, cx, cy, cz, width, thickness, slopeLen, color, {
    canCollide: false, // surface via RampSolid only (AABB would block like a wall)
    material: "SmoothPlastic",
  });
  part.isRamp = true;
  part.mesh.rotation.order = "YXZ";
  part.mesh.rotation.y = yaw;
  part.mesh.rotation.x = pitch;
  part.sync();
  // re-apply rotation after sync (sync doesn't touch rotation)
  part.mesh.rotation.order = "YXZ";
  part.mesh.rotation.y = yaw;
  part.mesh.rotation.x = pitch;

  workspace.addPart(part);
  workspace.addRamp(solid);
  return { part, solid };
}

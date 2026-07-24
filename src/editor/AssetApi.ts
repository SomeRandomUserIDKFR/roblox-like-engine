/**
 * Future editor / asset APIs — re-export so UI code can import from one place.
 *
 * Example (later):
 *   import { listFaceTextures, registerFaceTexture } from "./editor/AssetApi";
 *   for (const face of listFaceTextures()) picker.add(face.id, face.name);
 *   character.setFaceTextureId(selectedId);
 */
export {
  DEFAULT_FACE_TEXTURE_ID,
  getFaceTexture,
  listFaceTextures,
  registerFaceTexture,
  resolveFaceTexture,
  type FaceTextureAsset,
} from "../assets/FaceTextures";

export {
  Backpack,
  HOTBAR_ORDER,
  type HotbarSlotIndex,
  type InventoryItem,
} from "../inventory/Backpack";

export { Instance } from "../instances/Instance";
export { Part, makePart, type PartMaterial } from "../instances/Part";
export { makeRamp, type RampInstance } from "../instances/Ramp";
export { Workspace } from "../instances/Workspace";
export { STEP_HEIGHT } from "../physics/CollisionWorld";
export { createRampSolid, type RampSolid } from "../physics/Ramp";
export { buildStairs, buildStepPlatforms } from "../world/demoWorld";

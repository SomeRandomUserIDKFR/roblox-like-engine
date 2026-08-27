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
export { Model } from "../instances/Model";
export {
  Part,
  makePart,
  PART_MATERIALS,
  PART_MATERIAL_LABELS,
  POLYX_MATERIALS,
  type PartMaterial,
} from "../instances/Part";
export {
  ModuleScript,
  Script,
  SourceScript,
} from "../instances/Script";
export {
  PART_SHAPES,
  PART_SHAPE_LABELS,
  type PartShape,
} from "../instances/partShapes";
export { Tool, createDefaultTool, buildToolVisual } from "../instances/Tool";
export {
  ScreenGui,
  Frame,
  TextLabel,
  TextButton,
  GuiObject,
  ViewportFrame,
} from "../instances/Gui";
export {
  Animation,
  createWaveAnimation,
  createCheerAnimation,
  type RigKeyframe,
} from "../instances/Animation";
export { makeRamp, type RampInstance } from "../instances/Ramp";
export { Workspace } from "../instances/Workspace";
export { ScriptRuntime } from "../scripting/ScriptRuntime";
export { ToolRuntime } from "../tools/ToolRuntime";
export { GuiRuntime, createDefaultScreenGui, createDefaultViewportFrame } from "../gui/GuiRuntime";
export { AnimationPlayer } from "../animation/AnimationPlayer";
export { py } from "../scripting/py";
export { STEP_HEIGHT } from "../physics/CollisionWorld";
export { createRampSolid, type RampSolid } from "../physics/Ramp";
export { buildStairs, buildStepPlatforms } from "../world/demoWorld";

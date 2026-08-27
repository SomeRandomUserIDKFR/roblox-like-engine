import type { Instance } from "../../instances/Instance";
import { Model } from "../../instances/Model";
import { Part } from "../../instances/Part";
import type { SourceScript } from "../../instances/Script";
import type { Tool } from "../../instances/Tool";
import {
  Frame,
  ScreenGui,
  TextButton,
  TextLabel,
  ViewportFrame,
} from "../../instances/Gui";
import type { Workspace } from "../../instances/Workspace";
import {
  addInstance,
  addModel,
  addPartTo,
  removeInstance,
  removeModel,
  removePart,
  registerToolParts,
  unregisterToolParts,
} from "../studioOps";
import type { UndoCommand } from "./UndoStack";

export interface PartPose {
  px: number;
  py: number;
  pz: number;
  sx: number;
  sy: number;
  sz: number;
  rx: number;
  ry: number;
  rz: number;
  name: string;
  shape: Part["shape"];
  transparency: number;
  reflectance: number;
  material: Part["material"];
  color: number;
  // Roblox-like
  anchored: boolean;
  canCollide: boolean;
  canTouch: boolean;
  canQuery: boolean;
  castShadow: boolean;
  massless: boolean;
  locked: boolean;
  // PolyX traits
  slippery: boolean;
  bouncy: boolean;
  breakable: boolean;
  conductive: boolean;
  buoyant: boolean;
  magnetic: boolean;
  magneticPull: boolean;
  magneticPush: boolean;
  doubleSided: boolean;
  emitLight: boolean;
  absorbent: boolean;
  frost: boolean;
  isWater: boolean;
}

export function capturePartPose(part: Part): PartPose {
  return {
    px: part.position.x,
    py: part.position.y,
    pz: part.position.z,
    sx: part.size.x,
    sy: part.size.y,
    sz: part.size.z,
    rx: part.rotation.x,
    ry: part.rotation.y,
    rz: part.rotation.z,
    name: part.name,
    shape: part.shape,
    transparency: part.transparency,
    reflectance: part.reflectance,
    material: part.material,
    color: part.color.getHex(),
    anchored: part.anchored,
    canCollide: part.canCollide,
    canTouch: part.canTouch,
    canQuery: part.canQuery,
    castShadow: part.castShadow,
    massless: part.massless,
    locked: part.locked,
    slippery: part.slippery,
    bouncy: part.bouncy,
    breakable: part.breakable,
    conductive: part.conductive,
    buoyant: part.buoyant,
    magnetic: part.magnetic,
    magneticPull: part.magneticPull,
    magneticPush: part.magneticPush,
    doubleSided: part.doubleSided,
    emitLight: part.emitLight,
    absorbent: part.absorbent,
    frost: part.frost,
    isWater: part.isWater,
  };
}

export function applyPartPose(part: Part, pose: PartPose) {
  part.name = pose.name;
  part.shape = pose.shape ?? "Block";
  part.position.set(pose.px, pose.py, pose.pz);
  part.size.set(pose.sx, pose.sy, pose.sz);
  part.rotation.set(pose.rx, pose.ry, pose.rz);
  part.transparency = pose.transparency;
  part.reflectance = pose.reflectance;
  part.material = pose.material;
  part.color.set(pose.color);
  part.anchored = pose.anchored;
  part.canCollide = pose.canCollide;
  part.canTouch = pose.canTouch;
  part.canQuery = pose.canQuery;
  part.castShadow = pose.castShadow;
  part.massless = pose.massless;
  part.locked = pose.locked;
  part.slippery = pose.slippery;
  part.bouncy = pose.bouncy;
  part.breakable = pose.breakable;
  part.conductive = pose.conductive;
  part.buoyant = pose.buoyant;
  part.magnetic = pose.magnetic;
  part.magneticPull = pose.magneticPull ?? true;
  part.magneticPush = pose.magneticPush ?? false;
  part.doubleSided = pose.doubleSided;
  part.emitLight = pose.emitLight;
  part.absorbent = pose.absorbent;
  part.frost = pose.frost;
  part.isWater = pose.isWater;
  part.sync();
}

export function posesEqual(a: PartPose, b: PartPose) {
  return (
    a.px === b.px &&
    a.py === b.py &&
    a.pz === b.pz &&
    a.sx === b.sx &&
    a.sy === b.sy &&
    a.sz === b.sz &&
    a.rx === b.rx &&
    a.ry === b.ry &&
    a.rz === b.rz &&
    a.name === b.name &&
    a.shape === b.shape &&
    a.transparency === b.transparency &&
    a.reflectance === b.reflectance &&
    a.material === b.material &&
    a.color === b.color &&
    a.anchored === b.anchored &&
    a.canCollide === b.canCollide &&
    a.canTouch === b.canTouch &&
    a.canQuery === b.canQuery &&
    a.castShadow === b.castShadow &&
    a.massless === b.massless &&
    a.locked === b.locked &&
    a.slippery === b.slippery &&
    a.bouncy === b.bouncy &&
    a.breakable === b.breakable &&
    a.conductive === b.conductive &&
    a.buoyant === b.buoyant &&
    a.magnetic === b.magnetic &&
    a.magneticPull === b.magneticPull &&
    a.magneticPush === b.magneticPush &&
    a.doubleSided === b.doubleSided &&
    a.emitLight === b.emitLight &&
    a.absorbent === b.absorbent &&
    a.frost === b.frost &&
    a.isWater === b.isWater
  );
}

export function transformCommand(
  part: Part,
  before: PartPose,
  after: PartPose,
  label = "Transform",
): UndoCommand {
  return {
    label,
    undo: () => applyPartPose(part, before),
    redo: () => applyPartPose(part, after),
  };
}

export function insertPartCommand(
  workspace: Workspace,
  part: Part,
  parent: Instance,
): UndoCommand {
  return {
    label: `Insert ${part.name}`,
    undo: () => removePart(workspace, part),
    redo: () => addPartTo(workspace, part, parent),
  };
}

export function insertModelCommand(
  workspace: Workspace,
  model: Model,
  parent: Instance,
): UndoCommand {
  return {
    label: `Insert ${model.name}`,
    undo: () => removeModel(workspace, model),
    redo: () => addModel(workspace, model, parent),
  };
}

export function insertInstanceCommand(
  inst: Instance,
  parent: Instance,
): UndoCommand {
  return {
    label: `Insert ${inst.name}`,
    undo: () => removeInstance(inst),
    redo: () => addInstance(inst, parent),
  };
}

export function deleteInstanceCommand(inst: Instance): UndoCommand {
  const parent = inst.parent;
  const index = parent ? parent.children.indexOf(inst) : 0;
  return {
    label: `Delete ${inst.name}`,
    undo: () => {
      if (parent) addInstance(inst, parent, index);
    },
    redo: () => removeInstance(inst),
  };
}

export interface ScriptPose {
  name: string;
  source: string;
  enabled: boolean;
}

export function captureScriptPose(script: SourceScript): ScriptPose {
  return {
    name: script.name,
    source: script.source,
    enabled: script.enabled,
  };
}

export function applyScriptPose(script: SourceScript, pose: ScriptPose) {
  script.name = pose.name;
  script.source = pose.source;
  script.enabled = pose.enabled;
}

export function scriptPosesEqual(a: ScriptPose, b: ScriptPose) {
  return (
    a.name === b.name && a.source === b.source && a.enabled === b.enabled
  );
}

export function scriptEditCommand(
  script: SourceScript,
  before: ScriptPose,
  after: ScriptPose,
  label = "Edit Script",
): UndoCommand {
  return {
    label,
    undo: () => applyScriptPose(script, before),
    redo: () => applyScriptPose(script, after),
  };
}

/** Delete a Part (keeps object for redo). */
export function deletePartCommand(
  workspace: Workspace,
  part: Part,
): UndoCommand {
  const parent = part.parent ?? workspace;
  const index = parent.children.indexOf(part);
  return {
    label: `Delete ${part.name}`,
    undo: () => {
      addPartTo(workspace, part, parent, index);
    },
    redo: () => removePart(workspace, part),
  };
}

/**
 * Delete a Model and detach descendant Parts from the place
 * (parts stay on the Model tree for undo restore).
 */
export function deleteModelCommand(
  workspace: Workspace,
  model: Model,
): UndoCommand {
  const parent = model.parent ?? workspace;
  const index = parent.children.indexOf(model);
  const parts = model
    .getDescendants()
    .filter((c): c is Part => c instanceof Part);

  return {
    label: `Delete ${model.name}`,
    undo: () => {
      addModel(workspace, model, parent, index);
      for (const p of parts) {
        if (!workspace.parts.includes(p)) {
          workspace.parts.push(p);
        }
        if (!p.mesh.parent) workspace.root.add(p.mesh);
        p.sync();
      }
    },
    redo: () => removeModel(workspace, model),
  };
}

export function insertToolCommand(
  workspace: Workspace,
  tool: Tool,
  parent: Instance,
): UndoCommand {
  return {
    label: `Insert ${tool.name}`,
    undo: () => {
      unregisterToolParts(workspace, tool);
      removeInstance(tool);
    },
    redo: () => {
      addInstance(tool, parent);
      registerToolParts(workspace, tool);
    },
  };
}

export function deleteToolCommand(
  workspace: Workspace,
  tool: Tool,
): UndoCommand {
  const parent = tool.parent ?? workspace;
  const index = parent.children.indexOf(tool);
  return {
    label: `Delete ${tool.name}`,
    undo: () => {
      addInstance(tool, parent, index);
      registerToolParts(workspace, tool);
    },
    redo: () => {
      unregisterToolParts(workspace, tool);
      removeInstance(tool);
    },
  };
}

export interface ToolPose {
  name: string;
  icon: string;
  color: string;
  toolTip: string;
  requiresHandle: boolean;
  enabled: boolean;
}

export function captureToolPose(tool: Tool): ToolPose {
  return {
    name: tool.name,
    icon: tool.icon,
    color: tool.color,
    toolTip: tool.toolTip,
    requiresHandle: tool.requiresHandle,
    enabled: tool.enabled,
  };
}

export function applyToolPose(tool: Tool, pose: ToolPose) {
  tool.name = pose.name;
  tool.icon = pose.icon;
  tool.color = pose.color;
  tool.toolTip = pose.toolTip;
  tool.requiresHandle = pose.requiresHandle;
  tool.enabled = pose.enabled;
}

export function toolPosesEqual(a: ToolPose, b: ToolPose) {
  return (
    a.name === b.name &&
    a.icon === b.icon &&
    a.color === b.color &&
    a.toolTip === b.toolTip &&
    a.requiresHandle === b.requiresHandle &&
    a.enabled === b.enabled
  );
}

export function toolEditCommand(
  tool: Tool,
  before: ToolPose,
  after: ToolPose,
  label = "Edit Tool",
): UndoCommand {
  return {
    label,
    undo: () => applyToolPose(tool, before),
    redo: () => applyToolPose(tool, after),
  };
}

export interface GuiPose {
  name: string;
  visible?: boolean;
  enabled?: boolean;
  displayOrder?: number;
  anchorX?: number;
  anchorY?: number;
  offsetX?: number;
  offsetY?: number;
  sizeX?: number;
  sizeY?: number;
  offsetSizeX?: number;
  offsetSizeY?: number;
  backgroundColor?: number;
  backgroundTransparency?: number;
  zIndex?: number;
  text?: string;
  textColor?: number;
  textSize?: number;
  fontBold?: boolean;
  objectName?: string;
  showTestRig?: boolean;
  animationName?: string;
  cameraDistance?: number;
  cameraYaw?: number;
  cameraPitch?: number;
  lightColor?: number;
  ambientColor?: number;
}

export function captureGuiPose(
  inst: ScreenGui | Frame | TextLabel | TextButton | ViewportFrame,
): GuiPose {
  if (inst instanceof ScreenGui) {
    return {
      name: inst.name,
      enabled: inst.enabled,
      displayOrder: inst.displayOrder,
    };
  }
  const pose: GuiPose = {
    name: inst.name,
    visible: inst.visible,
    anchorX: inst.anchorX,
    anchorY: inst.anchorY,
    offsetX: inst.offsetX,
    offsetY: inst.offsetY,
    sizeX: inst.sizeX,
    sizeY: inst.sizeY,
    offsetSizeX: inst.offsetSizeX,
    offsetSizeY: inst.offsetSizeY,
    backgroundColor: inst.backgroundColor,
    backgroundTransparency: inst.backgroundTransparency,
    zIndex: inst.zIndex,
  };
  if (inst instanceof TextLabel) {
    pose.text = inst.text;
    pose.textColor = inst.textColor;
    pose.textSize = inst.textSize;
    pose.fontBold = inst.fontBold;
  }
  if (inst instanceof ViewportFrame) {
    pose.objectName = inst.objectName;
    pose.showTestRig = inst.showTestRig;
    pose.animationName = inst.animationName;
    pose.cameraDistance = inst.cameraDistance;
    pose.cameraYaw = inst.cameraYaw;
    pose.cameraPitch = inst.cameraPitch;
    pose.lightColor = inst.lightColor;
    pose.ambientColor = inst.ambientColor;
  }
  return pose;
}

export function applyGuiPose(
  inst: ScreenGui | Frame | TextLabel | TextButton | ViewportFrame,
  pose: GuiPose,
) {
  inst.name = pose.name;
  if (inst instanceof ScreenGui) {
    if (pose.enabled !== undefined) inst.enabled = pose.enabled;
    if (pose.displayOrder !== undefined) inst.displayOrder = pose.displayOrder;
    return;
  }
  if (pose.visible !== undefined) inst.visible = pose.visible;
  if (pose.anchorX !== undefined) inst.anchorX = pose.anchorX;
  if (pose.anchorY !== undefined) inst.anchorY = pose.anchorY;
  if (pose.offsetX !== undefined) inst.offsetX = pose.offsetX;
  if (pose.offsetY !== undefined) inst.offsetY = pose.offsetY;
  if (pose.sizeX !== undefined) inst.sizeX = pose.sizeX;
  if (pose.sizeY !== undefined) inst.sizeY = pose.sizeY;
  if (pose.offsetSizeX !== undefined) inst.offsetSizeX = pose.offsetSizeX;
  if (pose.offsetSizeY !== undefined) inst.offsetSizeY = pose.offsetSizeY;
  if (pose.backgroundColor !== undefined) {
    inst.backgroundColor = pose.backgroundColor;
  }
  if (pose.backgroundTransparency !== undefined) {
    inst.backgroundTransparency = pose.backgroundTransparency;
  }
  if (pose.zIndex !== undefined) inst.zIndex = pose.zIndex;
  if (inst instanceof TextLabel) {
    if (pose.text !== undefined) inst.text = pose.text;
    if (pose.textColor !== undefined) inst.textColor = pose.textColor;
    if (pose.textSize !== undefined) inst.textSize = pose.textSize;
    if (pose.fontBold !== undefined) inst.fontBold = pose.fontBold;
  }
  if (inst instanceof ViewportFrame) {
    if (pose.objectName !== undefined) inst.objectName = pose.objectName;
    if (pose.showTestRig !== undefined) inst.showTestRig = pose.showTestRig;
    if (pose.animationName !== undefined) {
      inst.animationName = pose.animationName;
    }
    if (pose.cameraDistance !== undefined) {
      inst.cameraDistance = pose.cameraDistance;
    }
    if (pose.cameraYaw !== undefined) inst.cameraYaw = pose.cameraYaw;
    if (pose.cameraPitch !== undefined) inst.cameraPitch = pose.cameraPitch;
    if (pose.lightColor !== undefined) inst.lightColor = pose.lightColor;
    if (pose.ambientColor !== undefined) inst.ambientColor = pose.ambientColor;
  }
}

export function guiPosesEqual(a: GuiPose, b: GuiPose) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function guiEditCommand(
  inst: ScreenGui | Frame | TextLabel | TextButton | ViewportFrame,
  before: GuiPose,
  after: GuiPose,
  label = "Edit GUI",
): UndoCommand {
  return {
    label,
    undo: () => applyGuiPose(inst, before),
    redo: () => applyGuiPose(inst, after),
  };
}


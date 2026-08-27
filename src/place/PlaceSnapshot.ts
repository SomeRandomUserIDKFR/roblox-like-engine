import {
  Animation,
  type RigKeyframe,
} from "../instances/Animation";
import {
  Frame,
  ScreenGui,
  TextButton,
  TextLabel,
  ViewportFrame,
} from "../instances/Gui";
import { Instance } from "../instances/Instance";
import { Model } from "../instances/Model";
import { makePart, Part, type PartMaterial, type PartShape } from "../instances/Part";
import { BindableEvent, RemoteEvent } from "../instances/RemoteEvent";
import { ModuleScript, Script } from "../instances/Script";
import { Tool } from "../instances/Tool";
import { Workspace } from "../instances/Workspace";
import { capturePartPose, type PartPose } from "../studio/undo/commands";

export interface PlaceNodeSnap {
  kind:
    | "Model"
    | "Part"
    | "Script"
    | "ModuleScript"
    | "Tool"
    | "ScreenGui"
    | "Frame"
    | "TextLabel"
    | "TextButton"
    | "ViewportFrame"
    | "Animation"
    | "RemoteEvent"
    | "BindableEvent";
  name: string;
  children?: PlaceNodeSnap[];
  pose?: PartPose;
  source?: string;
  enabled?: boolean;
  // Tool
  icon?: string;
  color?: string;
  toolTip?: string;
  requiresHandle?: boolean;
  // GUI
  visible?: boolean;
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
  // ViewportFrame
  objectName?: string;
  showTestRig?: boolean;
  animationName?: string;
  cameraDistance?: number;
  cameraYaw?: number;
  cameraPitch?: number;
  lightColor?: number;
  ambientColor?: number;
  // Animation
  length?: number;
  looped?: boolean;
  priority?: number;
  keyframes?: RigKeyframe[];
}

export interface PlaceSnapshot {
  version: 1;
  source: "hedronx";
  root: PlaceNodeSnap[];
}

function snapChildren(inst: Instance): PlaceNodeSnap[] {
  return inst.children
    .map(snapNode)
    .filter((n): n is PlaceNodeSnap => n !== null);
}

function snapGuiFields(
  inst: Frame | TextLabel | TextButton | ViewportFrame,
): PlaceNodeSnap {
  const base: PlaceNodeSnap = {
    kind:
      inst instanceof ViewportFrame
        ? "ViewportFrame"
        : inst instanceof TextButton
          ? "TextButton"
          : inst instanceof TextLabel
            ? "TextLabel"
            : "Frame",
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
    children: snapChildren(inst),
  };
  if (inst instanceof TextLabel) {
    base.text = inst.text;
    base.textColor = inst.textColor;
    base.textSize = inst.textSize;
    base.fontBold = inst.fontBold;
  }
  if (inst instanceof ViewportFrame) {
    base.objectName = inst.objectName;
    base.showTestRig = inst.showTestRig;
    base.animationName = inst.animationName;
    base.cameraDistance = inst.cameraDistance;
    base.cameraYaw = inst.cameraYaw;
    base.cameraPitch = inst.cameraPitch;
    base.lightColor = inst.lightColor;
    base.ambientColor = inst.ambientColor;
  }
  return base;
}

function snapNode(inst: Instance): PlaceNodeSnap | null {
  if (inst instanceof Part) {
    if (inst.isTestRig) return null;
    return {
      kind: "Part",
      name: inst.name,
      pose: capturePartPose(inst),
      children: snapChildren(inst),
    };
  }
  if (inst instanceof Model) {
    if (inst.name === "AnimationTestRig") return null;
    return {
      kind: "Model",
      name: inst.name,
      children: snapChildren(inst),
    };
  }
  if (inst instanceof Script) {
    return {
      kind: "Script",
      name: inst.name,
      source: inst.source,
      enabled: inst.enabled,
    };
  }
  if (inst instanceof ModuleScript) {
    return {
      kind: "ModuleScript",
      name: inst.name,
      source: inst.source,
      enabled: inst.enabled,
    };
  }
  if (inst instanceof Tool) {
    return {
      kind: "Tool",
      name: inst.name,
      icon: inst.icon,
      color: inst.color,
      toolTip: inst.toolTip,
      requiresHandle: inst.requiresHandle,
      enabled: inst.enabled,
      children: snapChildren(inst),
    };
  }
  if (inst instanceof ScreenGui) {
    return {
      kind: "ScreenGui",
      name: inst.name,
      enabled: inst.enabled,
      displayOrder: inst.displayOrder,
      children: snapChildren(inst),
    };
  }
  if (
    inst instanceof Frame ||
    inst instanceof TextLabel ||
    inst instanceof TextButton ||
    inst instanceof ViewportFrame
  ) {
    return snapGuiFields(inst);
  }
  if (inst instanceof Animation) {
    return {
      kind: "Animation",
      name: inst.name,
      length: inst.length,
      looped: inst.looped,
      priority: inst.priority,
      keyframes: JSON.parse(JSON.stringify(inst.keyframes)) as RigKeyframe[],
    };
  }
  if (inst instanceof RemoteEvent) {
    return { kind: "RemoteEvent", name: inst.name };
  }
  if (inst instanceof BindableEvent) {
    return { kind: "BindableEvent", name: inst.name };
  }
  return null;
}

/** Capture the current studio Workspace as a portable place. */
export function snapshotWorkspace(workspace: Workspace): PlaceSnapshot {
  return {
    version: 1,
    source: "hedronx",
    root: workspace.children
      .map(snapNode)
      .filter((n): n is PlaceNodeSnap => n !== null),
  };
}

function applyPoseToPart(part: Part, pose: PartPose) {
  part.name = pose.name;
  part.shape = (pose.shape as PartShape) ?? "Block";
  part.position.set(pose.px, pose.py, pose.pz);
  part.size.set(pose.sx, pose.sy, pose.sz);
  part.rotation.set(pose.rx, pose.ry, pose.rz);
  part.transparency = pose.transparency;
  part.reflectance = pose.reflectance;
  part.material = pose.material as PartMaterial;
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

function applyGuiNode(
  inst: Frame | TextLabel | TextButton | ViewportFrame,
  node: PlaceNodeSnap,
) {
  inst.visible = node.visible !== false;
  if (node.anchorX !== undefined) inst.anchorX = node.anchorX;
  if (node.anchorY !== undefined) inst.anchorY = node.anchorY;
  if (node.offsetX !== undefined) inst.offsetX = node.offsetX;
  if (node.offsetY !== undefined) inst.offsetY = node.offsetY;
  if (node.sizeX !== undefined) inst.sizeX = node.sizeX;
  if (node.sizeY !== undefined) inst.sizeY = node.sizeY;
  if (node.offsetSizeX !== undefined) inst.offsetSizeX = node.offsetSizeX;
  if (node.offsetSizeY !== undefined) inst.offsetSizeY = node.offsetSizeY;
  if (node.backgroundColor !== undefined) {
    inst.backgroundColor = node.backgroundColor;
  }
  if (node.backgroundTransparency !== undefined) {
    inst.backgroundTransparency = node.backgroundTransparency;
  }
  if (node.zIndex !== undefined) inst.zIndex = node.zIndex;
  if (inst instanceof TextLabel) {
    if (node.text !== undefined) inst.text = node.text;
    if (node.textColor !== undefined) inst.textColor = node.textColor;
    if (node.textSize !== undefined) inst.textSize = node.textSize;
    if (node.fontBold !== undefined) inst.fontBold = node.fontBold;
  }
  if (inst instanceof ViewportFrame) {
    if (node.objectName !== undefined) inst.objectName = node.objectName;
    if (node.showTestRig !== undefined) inst.showTestRig = node.showTestRig;
    if (node.animationName !== undefined) {
      inst.animationName = node.animationName;
    }
    if (node.cameraDistance !== undefined) {
      inst.cameraDistance = node.cameraDistance;
    }
    if (node.cameraYaw !== undefined) inst.cameraYaw = node.cameraYaw;
    if (node.cameraPitch !== undefined) inst.cameraPitch = node.cameraPitch;
    if (node.lightColor !== undefined) inst.lightColor = node.lightColor;
    if (node.ambientColor !== undefined) inst.ambientColor = node.ambientColor;
  }
}

function loadNode(workspace: Workspace, node: PlaceNodeSnap, parent: Instance) {
  if (node.kind === "Model") {
    const model = new Model(node.name);
    model.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, model);
    }
    return;
  }

  if (node.kind === "Part" && node.pose) {
    const part = makePart(node.name, 0, 0, 0, 4, 1, 2, 0x9e9e9e);
    applyPoseToPart(part, node.pose);
    workspace.addPart(part, parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, part);
    }
    return;
  }

  if (node.kind === "Script") {
    const script = new Script(node.name, node.source ?? "");
    script.enabled = node.enabled !== false;
    script.setParent(parent);
    return;
  }

  if (node.kind === "ModuleScript") {
    const mod = new ModuleScript(node.name, node.source ?? "");
    mod.enabled = node.enabled !== false;
    mod.setParent(parent);
    return;
  }

  if (node.kind === "Tool") {
    const tool = new Tool(node.name);
    tool.icon = node.icon ?? "⚒";
    tool.color = node.color ?? "#c9a227";
    tool.toolTip = node.toolTip ?? "";
    tool.requiresHandle = node.requiresHandle !== false;
    tool.enabled = node.enabled !== false;
    tool.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, tool);
    }
    return;
  }

  if (node.kind === "ScreenGui") {
    const gui = new ScreenGui(node.name);
    gui.enabled = node.enabled !== false;
    gui.displayOrder = node.displayOrder ?? 0;
    gui.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, gui);
    }
    return;
  }

  if (node.kind === "Frame") {
    const frame = new Frame(node.name);
    applyGuiNode(frame, node);
    frame.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, frame);
    }
    return;
  }

  if (node.kind === "TextLabel") {
    const label = new TextLabel(node.name);
    applyGuiNode(label, node);
    label.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, label);
    }
    return;
  }

  if (node.kind === "TextButton") {
    const btn = new TextButton(node.name);
    applyGuiNode(btn, node);
    btn.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, btn);
    }
    return;
  }

  if (node.kind === "ViewportFrame") {
    const vf = new ViewportFrame(node.name);
    applyGuiNode(vf, node);
    vf.setParent(parent);
    for (const child of node.children ?? []) {
      loadNode(workspace, child, vf);
    }
    return;
  }

  if (node.kind === "Animation") {
    const anim = new Animation(node.name, node.keyframes ?? []);
    anim.length = node.length ?? anim.length;
    anim.looped = node.looped !== false;
    anim.priority = node.priority ?? 0;
    anim.setParent(parent);
    return;
  }

  if (node.kind === "RemoteEvent") {
    new RemoteEvent(node.name).setParent(parent);
    return;
  }

  if (node.kind === "BindableEvent") {
    new BindableEvent(node.name).setParent(parent);
  }
}

/** Build a fresh Workspace from a HedronX place snapshot. */
export function workspaceFromSnapshot(snap: PlaceSnapshot): Workspace {
  const workspace = new Workspace();
  for (const node of snap.root) {
    loadNode(workspace, node, workspace);
  }
  return workspace;
}

/** Clear parts/children and load a snapshot into an existing Workspace (studio Open). */
export function loadSnapshotIntoWorkspace(
  workspace: Workspace,
  snap: PlaceSnapshot,
) {
  for (const part of [...workspace.parts]) {
    part.mesh.parent?.remove(part.mesh);
  }
  workspace.parts.length = 0;
  workspace.ramps.length = 0;
  for (const child of [...workspace.children]) {
    child.setParent(null);
  }
  for (const node of snap.root) {
    loadNode(workspace, node, workspace);
  }
}

/** Prefer Spawn / SpawnLocation top; else Baseplate; else origin. */
export function findSpawnPosition(workspace: Workspace): {
  x: number;
  y: number;
  z: number;
} {
  const spawn =
    workspace.findPart("Spawn") ??
    workspace.findPart("SpawnLocation") ??
    workspace.parts.find((p) => /spawn/i.test(p.name));
  if (spawn) {
    return {
      x: spawn.position.x,
      y: spawn.position.y + spawn.size.y * 0.5 + 3,
      z: spawn.position.z,
    };
  }
  const base = workspace.findPart("Baseplate");
  if (base) {
    return {
      x: 0,
      y: base.position.y + base.size.y * 0.5 + 3,
      z: 0,
    };
  }
  return { x: 0, y: 5, z: 0 };
}

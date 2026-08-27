import type { Instance } from "../instances/Instance";
import { Model } from "../instances/Model";
import { Part } from "../instances/Part";
import { Workspace } from "../instances/Workspace";

/** True if `node` may contain Parts / Models. */
export function isContainer(node: Instance): node is Workspace | Model {
  return node instanceof Workspace || node instanceof Model;
}

/** Parent to insert under given current selection. */
export function resolveInsertParent(
  workspace: Workspace,
  selected: Instance | null,
): Instance {
  if (!selected) return workspace;
  if (selected instanceof Workspace || selected instanceof Model) return selected;
  return selected.parent ?? workspace;
}

/** Unique name among Workspace descendants (+ root). */
export function nextUniqueName(workspace: Workspace, base: string) {
  const names = new Set<string>([workspace.name]);
  for (const d of workspace.getDescendants()) names.add(d.name);
  if (!names.has(base)) return base;
  let n = 1;
  while (names.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

export function nextPartName(workspace: Workspace, base = "Part") {
  return nextUniqueName(workspace, base);
}

export function nextModelName(workspace: Workspace, base = "Model") {
  return nextUniqueName(workspace, base);
}

export function nextScriptName(workspace: Workspace, base = "Script") {
  return nextUniqueName(workspace, base);
}

export function nextModuleScriptName(
  workspace: Workspace,
  base = "ModuleScript",
) {
  return nextUniqueName(workspace, base);
}

export function nextToolName(workspace: Workspace, base = "Tool") {
  return nextUniqueName(workspace, base);
}

export function nextScreenGuiName(workspace: Workspace, base = "ScreenGui") {
  return nextUniqueName(workspace, base);
}

export function nextViewportFrameName(
  workspace: Workspace,
  base = "ViewportFrame",
) {
  return nextUniqueName(workspace, base);
}

export function nextAnimationName(workspace: Workspace, base = "Animation") {
  return nextUniqueName(workspace, base);
}

export function nextRemoteEventName(
  workspace: Workspace,
  base = "RemoteEvent",
) {
  return nextUniqueName(workspace, base);
}

export function nextBindableEventName(
  workspace: Workspace,
  base = "BindableEvent",
) {
  return nextUniqueName(workspace, base);
}

/** Parent any non-Part instance (Script, ModuleScript, …) into the tree. */
export function addInstance(
  inst: Instance,
  parent: Instance,
  index?: number,
) {
  if (inst.parent) inst.setParent(null);
  if (index === undefined) {
    inst.setParent(parent);
  } else {
    inst.parent = parent;
    parent.children.splice(
      Math.max(0, Math.min(index, parent.children.length)),
      0,
      inst,
    );
  }
  return inst;
}

export function removeInstance(inst: Instance) {
  inst.setParent(null);
}

/** Register Part meshes belonging to a Tool (or any container). */
export function registerToolParts(workspace: Workspace, root: Instance) {
  const parts = root
    .getDescendants()
    .filter((c): c is Part => c instanceof Part);
  // Also include direct Part children already counted in getDescendants
  for (const p of parts) {
    p.sync();
    if (!workspace.parts.includes(p)) workspace.parts.push(p);
    if (!p.mesh.parent) workspace.root.add(p.mesh);
  }
}

export function unregisterToolParts(workspace: Workspace, root: Instance) {
  const parts = root
    .getDescendants()
    .filter((c): c is Part => c instanceof Part);
  for (const p of parts) {
    const i = workspace.parts.indexOf(p);
    if (i >= 0) workspace.parts.splice(i, 1);
    p.mesh.parent?.remove(p.mesh);
  }
}

/** Register Part mesh + list and parent into hierarchy. */
export function addPartTo(
  workspace: Workspace,
  part: Part,
  parent: Instance = workspace,
  index?: number,
) {
  if (part.parent) part.setParent(null);
  if (index === undefined) {
    part.setParent(parent);
  } else {
    part.parent = parent;
    parent.children.splice(Math.max(0, Math.min(index, parent.children.length)), 0, part);
  }
  part.sync();
  if (!workspace.parts.includes(part)) workspace.parts.push(part);
  if (!part.mesh.parent) workspace.root.add(part.mesh);
  return part;
}

export function removePart(workspace: Workspace, part: Part) {
  const i = workspace.parts.indexOf(part);
  if (i >= 0) workspace.parts.splice(i, 1);
  part.mesh.parent?.remove(part.mesh);
  part.setParent(null);
}

export function addModel(
  workspace: Workspace,
  model: Model,
  parent: Instance = workspace,
  index?: number,
) {
  void workspace;
  if (model.parent) model.setParent(null);
  if (index === undefined) {
    model.setParent(parent);
  } else {
    model.parent = parent;
    parent.children.splice(
      Math.max(0, Math.min(index, parent.children.length)),
      0,
      model,
    );
  }
  return model;
}

/** Remove model from tree and unregister all descendant Parts. */
export function removeModel(workspace: Workspace, model: Model) {
  const parts = model
    .getDescendants()
    .filter((c): c is Part => c instanceof Part);
  for (const p of parts) {
    const i = workspace.parts.indexOf(p);
    if (i >= 0) workspace.parts.splice(i, 1);
    p.mesh.parent?.remove(p.mesh);
    // Keep part.parent pointing at model (or nested) for undo restore
  }
  model.setParent(null);
}

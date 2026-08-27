import { Group, Mesh, Vector3 } from "three";
import { Instance } from "./Instance";
import { Part } from "./Part";
import { ModuleScript, Script } from "./Script";

/**
 * Equippable tool — visual from Part children (Handle convention) + scripts.
 * Place Tools are collected into the backpack on Play.
 */
export class Tool extends Instance {
  /** Hotbar icon glyph. */
  icon = "⚒";
  /** Accent color for hotbar. */
  color = "#c9a227";
  /** Short tip / display name override (falls back to Name). */
  toolTip = "";
  /** Prefer a child Part named "Handle" as grip origin. */
  requiresHandle = true;
  enabled = true;

  private readonly activated = new Set<() => void>();
  private readonly equipped = new Set<() => void>();
  private readonly unequipped = new Set<() => void>();

  constructor(name = "Tool") {
    super(name);
  }

  get displayName() {
    return this.toolTip.trim() || this.name;
  }

  /** Roblox-like: `tool.Activated(() => { ... })` */
  Activated(fn: () => void) {
    this.activated.add(fn);
    return () => this.activated.delete(fn);
  }

  Equipped(fn: () => void) {
    this.equipped.add(fn);
    return () => this.equipped.delete(fn);
  }

  Unequipped(fn: () => void) {
    this.unequipped.add(fn);
    return () => this.unequipped.delete(fn);
  }

  fireActivated() {
    for (const fn of this.activated) {
      try {
        fn();
      } catch (err) {
        console.error(`[Tool ${this.name}] Activated:`, err);
      }
    }
  }

  fireEquipped() {
    for (const fn of this.equipped) {
      try {
        fn();
      } catch (err) {
        console.error(`[Tool ${this.name}] Equipped:`, err);
      }
    }
  }

  fireUnequipped() {
    for (const fn of this.unequipped) {
      try {
        fn();
      } catch (err) {
        console.error(`[Tool ${this.name}] Unequipped:`, err);
      }
    }
  }

  getHandle(): Part | undefined {
    const named = this.children.find(
      (c): c is Part => c instanceof Part && c.name === "Handle",
    );
    if (named) return named;
    return this.children.find((c): c is Part => c instanceof Part);
  }

  getParts(): Part[] {
    return this.getDescendants().filter((d): d is Part => d instanceof Part);
  }

  getScripts(): Array<Script | ModuleScript> {
    return this.getDescendants().filter(
      (d): d is Script | ModuleScript =>
        d instanceof Script || d instanceof ModuleScript,
    );
  }
}

export function isUnderTool(inst: Instance): boolean {
  let p: Instance | null = inst.parent;
  while (p) {
    if (p instanceof Tool) return true;
    p = p.parent;
  }
  return false;
}

export function findToolAncestor(inst: Instance): Tool | undefined {
  let p: Instance | null = inst;
  while (p) {
    if (p instanceof Tool) return p;
    p = p.parent;
  }
  return undefined;
}

/**
 * Build a hand-held visual Group from Tool Part children,
 * origin = Handle center (or first Part).
 */
export function buildToolVisual(tool: Tool): Group {
  const group = new Group();
  group.name = `ToolVisual:${tool.name}`;
  const handle = tool.getHandle();
  const origin = handle
    ? handle.position.clone()
    : new Vector3();

  for (const part of tool.getParts()) {
    const mesh = new Mesh(part.mesh.geometry, part.mesh.material);
    mesh.castShadow = part.castShadow;
    mesh.receiveShadow = true;
    mesh.position.set(
      part.position.x - origin.x,
      part.position.y - origin.y,
      part.position.z - origin.z,
    );
    mesh.rotation.copy(part.rotation);
    mesh.scale.copy(part.size);
    mesh.visible = !part.destroyed;
    group.add(mesh);
  }

  return group;
}

/** Starter Tool with a Handle Part for Studio insert. */
export function createDefaultTool(name: string): Tool {
  const tool = new Tool(name);
  const handle = new Part("Handle");
  handle.setSize(0.4, 1.2, 0.4).setPosition(0, 3, 0).setColor(0xc9a227);
  handle.material = "Wood";
  handle.canCollide = false;
  handle.castShadow = true;
  handle.sync();
  handle.setParent(tool);

  const head = new Part("Head");
  head.setSize(1.2, 0.5, 0.7).setPosition(0, 3.85, 0).setColor(0x8a8f98);
  head.material = "Metal";
  head.canCollide = false;
  head.sync();
  head.setParent(tool);

  return tool;
}

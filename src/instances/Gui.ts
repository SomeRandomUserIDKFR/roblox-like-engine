import { Instance } from "./Instance";

/** Shared GUI layout / look fields (scale 0–1 of screen + pixel offset). */
export abstract class GuiObject extends Instance {
  visible = true;
  /** Scale position (0–1 of parent / screen). */
  anchorX = 0;
  anchorY = 0;
  offsetX = 0;
  offsetY = 0;
  /** Scale size (0–1). */
  sizeX = 0.2;
  sizeY = 0.08;
  offsetSizeX = 0;
  offsetSizeY = 0;
  backgroundColor = 0xffffff;
  backgroundTransparency = 0.15;
  zIndex = 1;

  constructor(name: string) {
    super(name);
  }
}

/** Root player GUI layer (like Roblox ScreenGui). */
export class ScreenGui extends Instance {
  enabled = true;
  /** Draw order among ScreenGuis. */
  displayOrder = 0;

  constructor(name = "ScreenGui") {
    super(name);
  }
}

export class Frame extends GuiObject {
  constructor(name = "Frame") {
    super(name);
    this.sizeX = 0.28;
    this.sizeY = 0.22;
    this.anchorX = 0.02;
    this.anchorY = 0.12;
    this.backgroundColor = 0x1a1f2a;
    this.backgroundTransparency = 0.25;
  }
}

export class TextLabel extends GuiObject {
  text = "Label";
  textColor = 0xffffff;
  textSize = 14;
  fontBold = false;

  constructor(name = "TextLabel") {
    super(name);
    this.sizeX = 0.2;
    this.sizeY = 0.05;
    this.backgroundTransparency = 1;
  }
}

/**
 * Clickable text button. Scripts: `button.Activated(() => { ... })`
 */
export class TextButton extends TextLabel {
  private readonly activated = new Set<() => void>();

  constructor(name = "TextButton") {
    super(name);
    this.text = "Button";
    this.backgroundColor = 0x3d7eff;
    this.backgroundTransparency = 0.05;
    this.sizeX = 0.14;
    this.sizeY = 0.055;
  }

  Activated(fn: () => void) {
    this.activated.add(fn);
    return () => this.activated.delete(fn);
  }

  fireActivated() {
    for (const fn of this.activated) {
      try {
        fn();
      } catch (err) {
        console.error(`[TextButton ${this.name}] Activated:`, err);
      }
    }
  }
}

/**
 * 3D view inside GUI — shows a Workspace Part/Model by name, child Parts,
 * and/or an R6 test rig playing an Animation.
 */
export class ViewportFrame extends GuiObject {
  /** Workspace Part or Model name to clone into this view (empty = none). */
  objectName = "";
  /** Show a local R6 test character in this viewport. */
  showTestRig = false;
  /** Animation instance name to play on the test rig. */
  animationName = "";
  cameraDistance = 7;
  cameraYaw = 0.55;
  cameraPitch = 0.35;
  lightColor = 0xffffff;
  ambientColor = 0x556677;

  constructor(name = "ViewportFrame") {
    super(name);
    this.sizeX = 0.22;
    this.sizeY = 0.3;
    this.anchorX = 0.76;
    this.anchorY = 0.1;
    this.backgroundColor = 0x152030;
    this.backgroundTransparency = 0.05;
  }
}

export function isGuiObject(inst: Instance): inst is GuiObject {
  return (
    inst instanceof Frame ||
    inst instanceof TextLabel ||
    inst instanceof TextButton ||
    inst instanceof ViewportFrame
  );
}

export function findScreenGuiAncestor(inst: Instance): ScreenGui | undefined {
  let p: Instance | null = inst;
  while (p) {
    if (p instanceof ScreenGui) return p;
    p = p.parent;
  }
  return undefined;
}

export function isUnderViewportFrame(inst: Instance): boolean {
  let p: Instance | null = inst.parent;
  while (p) {
    if (p instanceof ViewportFrame) return true;
    p = p.parent;
  }
  return false;
}

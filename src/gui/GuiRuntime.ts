import {
  Frame,
  GuiObject,
  ScreenGui,
  TextButton,
  TextLabel,
  ViewportFrame,
} from "../instances/Gui";
import type { Instance } from "../instances/Instance";
import { Part } from "../instances/Part";
import type { Workspace } from "../instances/Workspace";
import { ViewportFrameView } from "./ViewportFrameView";

function hexCss(hex: number, alpha = 1) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Mounts ScreenGui trees as DOM overlays for Play.
 */
export class GuiRuntime {
  private readonly root: HTMLDivElement;
  private disposed = false;
  private readonly viewports: ViewportFrameView[] = [];
  private mountGen = 0;

  constructor(private readonly workspace: Workspace) {
    this.root = document.createElement("div");
    this.root.id = "player-gui";
    this.root.style.cssText = [
      "position:fixed",
      "inset:0",
      "pointer-events:none",
      "z-index:40",
      "font-family:Segoe UI,system-ui,sans-serif",
    ].join(";");
    document.body.appendChild(this.root);
  }

  async mount() {
    this.disposeViewports();
    this.root.innerHTML = "";
    const gen = ++this.mountGen;

    const guis = this.workspace
      .getDescendants()
      .filter((d): d is ScreenGui => d instanceof ScreenGui && d.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    for (const gui of guis) {
      const layer = document.createElement("div");
      layer.dataset.screenGui = gui.name;
      layer.style.cssText =
        "position:absolute;inset:0;pointer-events:none;";
      this.root.appendChild(layer);
      for (const child of gui.children) {
        await this.mountNode(child, layer, gen);
        if (this.disposed || gen !== this.mountGen) return;
      }
    }
  }

  private async mountNode(
    inst: Instance,
    parentEl: HTMLElement,
    gen: number,
  ) {
    if (inst instanceof Part) return;

    if (inst instanceof ViewportFrame) {
      const el = this.makeBox(inst);
      el.dataset.gui = "ViewportFrame";
      el.style.overflow = "hidden";
      el.style.padding = "0";
      parentEl.appendChild(el);
      const view = new ViewportFrameView(el, inst, this.workspace);
      await view.init();
      if (this.disposed || gen !== this.mountGen) {
        view.dispose();
        return;
      }
      this.viewports.push(view);
      return;
    }

    if (inst instanceof Frame) {
      const el = this.makeBox(inst);
      el.dataset.gui = "Frame";
      parentEl.appendChild(el);
      for (const child of inst.children) {
        await this.mountNode(child, el, gen);
      }
      return;
    }

    if (inst instanceof TextButton) {
      const el = this.makeBox(inst);
      el.dataset.gui = "TextButton";
      el.style.pointerEvents = inst.visible ? "auto" : "none";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.userSelect = "none";
      el.style.fontSize = `${inst.textSize}px`;
      el.style.fontWeight = inst.fontBold ? "700" : "600";
      el.style.color = hexCss(inst.textColor, 1);
      el.textContent = inst.text;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        inst.fireActivated();
      });
      parentEl.appendChild(el);
      for (const child of inst.children) {
        await this.mountNode(child, el, gen);
      }
      return;
    }

    if (inst instanceof TextLabel) {
      const el = this.makeBox(inst);
      el.dataset.gui = "TextLabel";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = `${inst.textSize}px`;
      el.style.fontWeight = inst.fontBold ? "700" : "500";
      el.style.color = hexCss(inst.textColor, 1);
      el.style.pointerEvents = "none";
      el.textContent = inst.text;
      parentEl.appendChild(el);
      for (const child of inst.children) {
        await this.mountNode(child, el, gen);
      }
      return;
    }

    if (inst instanceof ScreenGui) {
      for (const child of inst.children) {
        await this.mountNode(child, parentEl, gen);
      }
    }
  }

  private makeBox(obj: GuiObject): HTMLDivElement {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.left = `calc(${obj.anchorX * 100}% + ${obj.offsetX}px)`;
    el.style.top = `calc(${obj.anchorY * 100}% + ${obj.offsetY}px)`;
    el.style.width = `calc(${obj.sizeX * 100}% + ${obj.offsetSizeX}px)`;
    el.style.height = `calc(${obj.sizeY * 100}% + ${obj.offsetSizeY}px)`;
    el.style.boxSizing = "border-box";
    el.style.borderRadius = "6px";
    el.style.zIndex = String(obj.zIndex);
    el.style.pointerEvents = "none";
    el.style.visibility = obj.visible ? "visible" : "hidden";
    const alpha = Math.max(0, Math.min(1, 1 - obj.backgroundTransparency));
    el.style.background = hexCss(obj.backgroundColor, alpha);
    if (alpha > 0.05) {
      el.style.boxShadow = "0 4px 18px rgba(0,0,0,0.25)";
      el.style.border = "1px solid rgba(255,255,255,0.08)";
    }
    return el;
  }

  /** Tick ViewportFrame 3D views. */
  update(dt: number) {
    for (const v of this.viewports) v.update(dt);
  }

  private disposeViewports() {
    for (const v of this.viewports) v.dispose();
    this.viewports.length = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeViewports();
    this.root.remove();
  }
}

export function createDefaultScreenGui(name = "ScreenGui"): ScreenGui {
  const gui = new ScreenGui(name);
  const frame = new Frame("Panel");
  frame.setParent(gui);

  const title = new TextLabel("Title");
  title.text = "PolyX UI";
  title.textSize = 16;
  title.fontBold = true;
  title.anchorX = 0.08;
  title.anchorY = 0.1;
  title.sizeX = 0.84;
  title.sizeY = 0.22;
  title.backgroundTransparency = 1;
  title.setParent(frame);

  const btn = new TextButton("Action");
  btn.text = "Click me";
  btn.anchorX = 0.15;
  btn.anchorY = 0.5;
  btn.sizeX = 0.7;
  btn.sizeY = 0.32;
  btn.setParent(frame);

  return gui;
}

export function createDefaultViewportFrame(
  name = "ViewportFrame",
): ViewportFrame {
  const vf = new ViewportFrame(name);
  vf.showTestRig = true;
  vf.animationName = "WaveAnim";
  vf.objectName = "";
  return vf;
}

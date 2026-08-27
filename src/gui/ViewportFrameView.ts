import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
} from "three";
import { WebGPURenderer } from "three/webgpu";
import { AnimationPlayer } from "../animation/AnimationPlayer";
import { Animation } from "../instances/Animation";
import { ViewportFrame } from "../instances/Gui";
import { Model } from "../instances/Model";
import { Part } from "../instances/Part";
import type { Workspace } from "../instances/Workspace";
import { R6Character } from "../player/R6Character";

/**
 * One ViewportFrame's offscreen Three.js view (own renderer + scene).
 */
export class ViewportFrameView {
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly content = new Group();
  private renderer: WebGPURenderer | null = null;
  private player: AnimationPlayer | null = null;
  private disposed = false;
  private lastObject = "";
  private lastAnim = "";
  private lastShowRig = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly frame: ViewportFrame,
    private readonly workspace: Workspace,
  ) {
    this.camera = new PerspectiveCamera(45, 1, 0.1, 200);
    this.scene.add(this.content);
  }

  async init() {
    const renderer = new WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText =
      "width:100%;height:100%;display:block;border-radius:4px;";
    this.host.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.rebuildLights();
    this.rebuildContent();
    this.resize();
  }

  private rebuildLights() {
    // Clear prior lights (keep content group)
    const remove: typeof this.scene.children = [];
    for (const c of this.scene.children) {
      if (c !== this.content) remove.push(c);
    }
    for (const c of remove) this.scene.remove(c);

    this.scene.background = new Color(this.frame.backgroundColor);
    const amb = new AmbientLight(this.frame.ambientColor, 0.85);
    const dir = new DirectionalLight(this.frame.lightColor, 1.15);
    dir.position.set(4, 8, 5);
    this.scene.add(amb, dir);
  }

  private clearContent() {
    while (this.content.children.length) {
      this.content.remove(this.content.children[0]!);
    }
    this.player = null;
  }

  private clonePartMesh(part: Part): Mesh {
    const mesh = new Mesh(part.mesh.geometry, part.mesh.material);
    mesh.position.copy(part.position);
    mesh.rotation.copy(part.rotation);
    mesh.scale.copy(part.size);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  private addWorldObject(name: string) {
    const part = this.workspace.parts.find((p) => p.name === name);
    if (part) {
      const m = this.clonePartMesh(part);
      // Center around origin for framing
      m.position.set(0, 0, 0);
      this.content.add(m);
      return;
    }
    const model = this.workspace
      .getDescendants()
      .find((d): d is Model => d instanceof Model && d.name === name);
    if (!model) return;
    const parts = model
      .getDescendants()
      .filter((d): d is Part => d instanceof Part);
    if (!parts.length) return;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const p of parts) {
      cx += p.position.x;
      cy += p.position.y;
      cz += p.position.z;
    }
    cx /= parts.length;
    cy /= parts.length;
    cz /= parts.length;
    for (const p of parts) {
      const m = this.clonePartMesh(p);
      m.position.set(
        p.position.x - cx,
        p.position.y - cy,
        p.position.z - cz,
      );
      this.content.add(m);
    }
  }

  private addChildParts() {
    for (const child of this.frame.getDescendants()) {
      if (child instanceof Part) {
        const m = this.clonePartMesh(child);
        this.content.add(m);
      }
    }
  }

  private findAnimation(name: string): Animation | undefined {
    if (!name) return undefined;
    return this.workspace
      .getDescendants()
      .find((d): d is Animation => d instanceof Animation && d.name === name);
  }

  rebuildContent() {
    this.clearContent();
    this.rebuildLights();

    if (this.frame.objectName.trim()) {
      this.addWorldObject(this.frame.objectName.trim());
    }
    this.addChildParts();

    if (this.frame.showTestRig) {
      const rig = new R6Character();
      for (const part of Object.values(rig.parts)) {
        part.setMaterialPreset("plastic");
      }
      rig.root.position.set(0, 0, 0);
      this.content.add(rig.getObject3D());
      const anim = this.findAnimation(this.frame.animationName);
      this.player = new AnimationPlayer(rig, anim ?? null);
      if (anim) this.player.play(anim);
    }

    this.lastObject = this.frame.objectName;
    this.lastAnim = this.frame.animationName;
    this.lastShowRig = this.frame.showTestRig;
  }

  private maybeRefresh() {
    if (
      this.frame.objectName !== this.lastObject ||
      this.frame.animationName !== this.lastAnim ||
      this.frame.showTestRig !== this.lastShowRig
    ) {
      this.rebuildContent();
    }
    // Keep animation reference fresh
    if (this.player && this.frame.showTestRig) {
      const anim = this.findAnimation(this.frame.animationName);
      if (anim && this.player.animation !== anim) {
        this.player.play(anim);
      }
    }
  }

  resize() {
    if (!this.renderer) return;
    const w = Math.max(2, this.host.clientWidth || 160);
    const h = Math.max(2, this.host.clientHeight || 160);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  update(dt: number) {
    if (this.disposed || !this.renderer) return;
    this.maybeRefresh();
    this.player?.update(dt);

    const dist = Math.max(1, this.frame.cameraDistance);
    const yaw = this.frame.cameraYaw;
    const pitch = this.frame.cameraPitch;
    const targetY = this.frame.showTestRig ? 1.2 : 0;
    this.camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      targetY + Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    this.camera.lookAt(0, targetY, 0);

    this.scene.background = new Color(this.frame.backgroundColor);
    this.resize();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.clearContent();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }
}

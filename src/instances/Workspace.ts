import { Group, type Object3D, type Scene } from "three";
import type { AABB } from "../physics/AABB";
import type { RampSolid } from "../physics/Ramp";
import { Instance } from "./Instance";
import { Part } from "./Part";
import { isUnderTool } from "./Tool";
import { isUnderViewportFrame } from "./Gui";

/**
 * Workspace root — holds Parts for the running place (studio later parents here).
 */
export class Workspace extends Instance {
  /** Three.js node under the scene. */
  readonly root = new Group();
  readonly parts: Part[] = [];
  readonly ramps: RampSolid[] = [];

  constructor() {
    super("Workspace");
    this.root.name = "Workspace";
  }

  mount(scene: Scene) {
    scene.add(this.root);
  }

  addPart(part: Part, parent: Instance = this) {
    if (part.parent) part.setParent(null);
    part.setParent(parent);
    part.sync();
    if (!this.parts.includes(part)) this.parts.push(part);
    if (!part.mesh.parent) this.root.add(part.mesh);
    return part;
  }

  addRamp(ramp: RampSolid) {
    this.ramps.push(ramp);
    return ramp;
  }

  /** Collision AABBs for CanCollide block parts (not ramps / tool handles). */
  getColliders(): AABB[] {
    return this.parts
      .filter(
        (p) =>
          p.canCollide &&
          !p.isRamp &&
          !p.destroyed &&
          !isUnderTool(p) &&
          !isUnderViewportFrame(p),
      )
      .map((p) => p.getAABB());
  }

  getRamps(): RampSolid[] {
    return this.ramps;
  }

  /** Meshes for camera raycasts / shadows. */
  getObstacles(): Object3D[] {
    return this.parts
      .filter(
        (p) => !p.destroyed && !isUnderTool(p) && !isUnderViewportFrame(p),
      )
      .map((p) => p.mesh);
  }

  findPart(name: string): Part | undefined {
    return this.parts.find((p) => p.name === name);
  }
}

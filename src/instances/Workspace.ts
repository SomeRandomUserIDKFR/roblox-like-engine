import { Group, type Object3D, type Scene } from "three";
import type { AABB } from "../physics/AABB";
import type { RampSolid } from "../physics/Ramp";
import { Instance } from "./Instance";
import { Part } from "./Part";

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

  addPart(part: Part) {
    part.setParent(this);
    part.sync();
    this.parts.push(part);
    this.root.add(part.mesh);
    return part;
  }

  addRamp(ramp: RampSolid) {
    this.ramps.push(ramp);
    return ramp;
  }

  /** Collision AABBs for CanCollide block parts (not ramps). */
  getColliders(): AABB[] {
    return this.parts
      .filter((p) => p.canCollide && !p.isRamp)
      .map((p) => p.getAABB());
  }

  getRamps(): RampSolid[] {
    return this.ramps;
  }

  /** Meshes for camera raycasts / shadows. */
  getObstacles(): Object3D[] {
    return this.parts.map((p) => p.mesh);
  }

  findPart(name: string): Part | undefined {
    return this.parts.find((p) => p.name === name);
  }
}

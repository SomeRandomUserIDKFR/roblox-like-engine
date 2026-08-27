import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Object3D,
} from "three";
import type { Part } from "../../instances/Part";
import type { StudioTool } from "../StudioSession";

export type HandleAxis = "x" | "y" | "z";
export type HandleKind = "move" | "scale" | "rotate";

export interface HandleHit {
  kind: HandleKind;
  axis: HandleAxis;
  /** +1 / -1 for scale faces; always +1 for move/rotate. */
  sign: 1 | -1;
  object: Object3D;
}

const AXIS_COLOR = {
  x: 0xe81123,
  y: 0x16c60c,
  z: 0x0078d4,
} as const;

const AXIS_DIR: Record<HandleAxis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

const DOT = new SphereGeometry(0.28, 16, 12);
const STEM = new CylinderGeometry(0.07, 0.07, 1, 8);
const RING = new TorusGeometry(1, 0.06, 8, 48);

type Tagged = Mesh & {
  userData: {
    hxHandle: true;
    kind: HandleKind;
    axis: HandleAxis;
    sign: 1 | -1;
  };
};

/**
 * Classic Roblox Studio–style handles: colored axes with sphere “dots”.
 */
export class TransformHandles {
  readonly root = new Group();
  private readonly moveGroup = new Group();
  private readonly scaleGroup = new Group();
  private readonly rotateGroup = new Group();
  private readonly pickables: Object3D[] = [];
  private part: Part | null = null;
  private readonly tmp = new Vector3();

  constructor() {
    this.root.name = "TransformHandles";
    this.root.renderOrder = 10;
    this.buildMove();
    this.buildScale();
    this.buildRotate();
    this.root.add(this.moveGroup, this.scaleGroup, this.rotateGroup);
    this.root.visible = false;
  }

  getPickables() {
    return this.pickables;
  }

  setTarget(part: Part | null, tool: StudioTool) {
    this.part = part;
    const show =
      part !== null &&
      (tool === "move" || tool === "scale" || tool === "rotate");
    this.root.visible = show;
    this.moveGroup.visible = tool === "move";
    this.scaleGroup.visible = tool === "scale";
    this.rotateGroup.visible = tool === "rotate";
    this.sync();
  }

  sync() {
    if (!this.part || !this.root.visible) return;
    this.root.position.copy(this.part.position);
    this.scaleGroup.rotation.copy(this.part.rotation);

    const extent = Math.max(
      this.part.size.x,
      this.part.size.y,
      this.part.size.z,
      2,
    );
    const arm = Math.max(2.5, extent * 0.65 + 1.2);
    this.moveGroup.scale.setScalar(arm);
    this.rotateGroup.scale.setScalar(arm * 0.85);

    // Scale dots sit on faces of the part (local space)
    for (const child of this.scaleGroup.children) {
      const mesh = child as Tagged;
      const { axis, sign } = mesh.userData;
      const half = this.part.size[axis] * 0.5;
      mesh.position.set(0, 0, 0);
      mesh.position[axis] = half * sign;
    }
  }

  hitFromObject(obj: Object3D | null): HandleHit | null {
    let cur: Object3D | null = obj;
    while (cur) {
      const data = cur.userData as Tagged["userData"];
      if (data?.hxHandle) {
        return {
          kind: data.kind,
          axis: data.axis,
          sign: data.sign,
          object: cur,
        };
      }
      cur = cur.parent;
    }
    return null;
  }

  axisDir(axis: HandleAxis) {
    return AXIS_DIR[axis];
  }

  private tag(
    mesh: Mesh,
    kind: HandleKind,
    axis: HandleAxis,
    sign: 1 | -1 = 1,
  ): Tagged {
    const t = mesh as Tagged;
    t.userData = { hxHandle: true, kind, axis, sign };
    t.renderOrder = 11;
    this.pickables.push(t);
    return t;
  }

  private mat(hex: number, opacity = 1) {
    return new MeshBasicMaterial({
      color: hex,
      depthTest: false,
      depthWrite: false,
      transparent: opacity < 1,
      opacity,
      toneMapped: false,
    });
  }

  private buildMove() {
    for (const axis of ["x", "y", "z"] as HandleAxis[]) {
      const color = AXIS_COLOR[axis];
      const g = new Group();
      g.name = `move-${axis}`;

      const stem = this.tag(new Mesh(STEM, this.mat(color)), "move", axis);
      stem.position.y = 0.5;
      // Default cylinder is Y-up; reorient to axis
      if (axis === "x") {
        g.rotation.z = -Math.PI / 2;
      } else if (axis === "z") {
        g.rotation.x = Math.PI / 2;
      }

      const tip = this.tag(new Mesh(DOT, this.mat(color)), "move", axis);
      tip.position.y = 1.05;
      tip.scale.setScalar(1.15);

      g.add(stem, tip);
      this.moveGroup.add(g);
    }
  }

  private buildScale() {
    for (const axis of ["x", "y", "z"] as HandleAxis[]) {
      for (const sign of [1, -1] as const) {
        const color = AXIS_COLOR[axis];
        const dot = this.tag(
          new Mesh(DOT, this.mat(color)),
          "scale",
          axis,
          sign,
        );
        dot.scale.setScalar(1.05);
        this.scaleGroup.add(dot);
      }
    }
  }

  private buildRotate() {
    for (const axis of ["x", "y", "z"] as HandleAxis[]) {
      const color = AXIS_COLOR[axis];
      const ring = this.tag(new Mesh(RING, this.mat(color, 0.92)), "rotate", axis);
      if (axis === "x") ring.rotation.y = Math.PI / 2;
      else if (axis === "y") ring.rotation.x = Math.PI / 2;
      // z: default torus in XY plane = rotate around Z

      // Classic accent dots on the ring
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const dot = this.tag(new Mesh(DOT, this.mat(color)), "rotate", axis);
        dot.scale.setScalar(0.7);
        if (axis === "z") {
          dot.position.set(Math.cos(ang), Math.sin(ang), 0);
        } else if (axis === "y") {
          // ring rotated X 90°: lies in XZ
          dot.position.set(Math.cos(ang), 0, Math.sin(ang));
        } else {
          // ring rotated Y 90°: lies in YZ
          dot.position.set(0, Math.cos(ang), Math.sin(ang));
        }
        this.rotateGroup.add(dot);
      }
      this.rotateGroup.add(ring);
    }
  }

  /** World-space point on a move arm tip (for debugging / snap). */
  tipWorld(axis: HandleAxis, out = this.tmp) {
    out.copy(AXIS_DIR[axis]).multiplyScalar(this.moveGroup.scale.x);
    out.add(this.root.position);
    return out;
  }
}

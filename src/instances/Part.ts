import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { aabbFromCenter, type AABB } from "../physics/AABB";
import { Instance } from "./Instance";

const sharedBox = new BoxGeometry(1, 1, 1);

export type PartMaterial = "Plastic" | "SmoothPlastic" | "Metal";

/**
 * Studio-like Part: Size / Position / Color / CanCollide.
 * Mesh is a unit cube scaled by Size (center = Position).
 */
export class Part extends Instance {
  readonly size = new Vector3(4, 1, 2);
  readonly position = new Vector3();
  readonly color = new Color(0x9e9e9e);

  canCollide = true;
  anchored = true;
  transparency = 0;
  material: PartMaterial = "Plastic";
  /** Ramp/wedge — uses RampSolid, not AABB. */
  isRamp = false;

  readonly mesh: Mesh;
  private readonly mat: MeshStandardMaterial;

  constructor(name = "Part") {
    super(name);
    this.mat = new MeshStandardMaterial({
      color: this.color.clone(),
      roughness: 0.85,
      metalness: 0.05,
    });
    this.mesh = new Mesh(sharedBox, this.mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = name;
    this.sync();
  }

  setSize(x: number, y: number, z: number) {
    this.size.set(x, y, z);
    this.sync();
    return this;
  }

  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.sync();
    return this;
  }

  setColor(hex: number) {
    this.color.set(hex);
    this.sync();
    return this;
  }

  setCanCollide(value: boolean) {
    this.canCollide = value;
    return this;
  }

  setMaterial(material: PartMaterial) {
    this.material = material;
    this.sync();
    return this;
  }

  /** Push Size / Position / Color / material onto the Three mesh. */
  sync() {
    this.mesh.name = this.name;
    this.mesh.scale.copy(this.size);
    this.mesh.position.copy(this.position);
    this.mat.color.copy(this.color);
    this.mat.transparent = this.transparency > 0.001;
    this.mat.opacity = 1 - this.transparency;
    if (this.material === "Metal") {
      this.mat.metalness = 0.55;
      this.mat.roughness = 0.4;
    } else if (this.material === "SmoothPlastic") {
      this.mat.metalness = 0;
      this.mat.roughness = 0.55;
    } else {
      this.mat.metalness = 0.05;
      this.mat.roughness = 0.85;
    }
    this.mat.needsUpdate = true;
  }

  getAABB(): AABB {
    return aabbFromCenter(
      this.position.x,
      this.position.y,
      this.position.z,
      this.size.x,
      this.size.y,
      this.size.z,
    );
  }
}

/** Create a Part with common studio props in one call. */
export function makePart(
  name: string,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  color: number,
  opts?: { canCollide?: boolean; material?: PartMaterial },
): Part {
  const p = new Part(name);
  p.setSize(sx, sy, sz).setPosition(cx, cy, cz).setColor(color);
  if (opts?.canCollide === false) p.setCanCollide(false);
  if (opts?.material) p.setMaterial(opts.material);
  return p;
}

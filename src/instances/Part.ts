import {
  Color,
  DoubleSide,
  Euler,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { aabbFromCenter, type AABB } from "../physics/AABB";
import { Instance } from "./Instance";
import {
  applyPartMaterial,
  tintPartMaterial,
  type PartMaterial,
} from "./materials";
import {
  geometryForShape,
  type PartShape,
} from "./partShapes";

export type { PartMaterial } from "./materials";
export type { PartShape } from "./partShapes";
export {
  PART_MATERIALS,
  PART_MATERIAL_LABELS,
  POLYX_MATERIALS,
} from "./materials";
export { PART_SHAPES, PART_SHAPE_LABELS } from "./partShapes";

/**
 * Studio-like Part: Size / Position / Rotation / Color / Material / Shape + flags.
 * Mesh is a unit geometry scaled by Size (center = Position).
 */
export class Part extends Instance {
  readonly size = new Vector3(4, 1, 2);
  readonly position = new Vector3();
  /** Local rotation in radians (XYZ Euler). */
  readonly rotation = new Euler(0, 0, 0, "XYZ");
  readonly color = new Color(0x9e9e9e);
  shape: PartShape = "Block";

  // —— Appearance ——
  transparency = 0;
  /** 0–1 specular / metal boost (Roblox-like). */
  reflectance = 0;
  material: PartMaterial = "Plastic";

  // —— Roblox-like behavior ——
  anchored = true;
  canCollide = true;
  canTouch = true;
  canQuery = true;
  castShadow = true;
  massless = false;
  locked = false;

  // —— PolyX traits (material-agnostic checkboxes) ——
  /** Low friction when physics uses it. */
  slippery = false;
  /** Extra restitution later. */
  bouncy = false;
  /** Marks as destructible / glass-like. */
  breakable = false;
  /** Conducts “energy” / lightning hooks later. */
  conductive = false;
  /** Floats in water volumes later. */
  buoyant = false;
  /** Attracts / repels the player when magnetic is on. */
  magnetic = false;
  /** Pull toward this part (only used when magnetic). */
  magneticPull = true;
  /** Push away from this part (only used when magnetic). */
  magneticPush = false;
  /** Render both faces (thin panels). */
  doubleSided = false;
  /** Extra emissive glow regardless of material. */
  emitLight = false;
  /** High friction / dampens slides. */
  absorbent = false;
  /** Frosted look hint (visual). */
  frost = false;
  /** Marks part as a water volume (visual + gameplay). */
  isWater = false;

  /** Runtime: broken in play (not saved to studio pose unless we want). */
  destroyed = false;

  /** Ramp/wedge — uses RampSolid, not AABB. */
  isRamp = false;

  /** Studio-only animation proxy limb — never persisted in place snapshots. */
  isTestRig = false;

  readonly mesh: Mesh;
  private readonly mat: MeshStandardMaterial;

  constructor(name = "Part") {
    super(name);
    this.mat = new MeshStandardMaterial({
      color: this.color.clone(),
      roughness: 0.85,
      metalness: 0.05,
    });
    this.mesh = new Mesh(geometryForShape(this.shape), this.mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.name = name;
    this.sync();
  }

  setShape(shape: PartShape) {
    this.shape = shape;
    this.sync();
    return this;
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

  setRotation(x: number, y: number, z: number) {
    this.rotation.set(x, y, z);
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

  /** Push Size / Position / Rotation / Color / material / flags onto the mesh. */
  sync() {
    this.mesh.name = this.name;
    this.mesh.visible = !this.destroyed;
    const geo = geometryForShape(this.shape);
    if (this.mesh.geometry !== geo) this.mesh.geometry = geo;
    this.mesh.scale.copy(this.size);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);

    applyPartMaterial(this.mat, this.material, {
      sizeX: this.size.x,
      sizeY: this.size.y,
      sizeZ: this.size.z,
      transparency: this.transparency,
    });
    tintPartMaterial(this.mat, this.material, this.color);

    if (this.reflectance > 0.001) {
      this.mat.metalness = Math.min(
        1,
        this.mat.metalness + this.reflectance * 0.85,
      );
      this.mat.roughness = Math.max(
        0.04,
        this.mat.roughness * (1 - this.reflectance * 0.7),
      );
    }

    if (this.frost) {
      this.mat.roughness = Math.min(1, this.mat.roughness + 0.35);
      this.mat.transparent = true;
      this.mat.opacity = Math.min(this.mat.opacity, 0.85);
      this.mat.depthWrite = this.mat.opacity > 0.9;
    }

    if (this.isWater) {
      this.mat.transparent = true;
      this.mat.opacity = Math.min(this.mat.opacity, 0.45);
      this.mat.roughness = Math.min(this.mat.roughness, 0.12);
      this.mat.metalness = Math.min(this.mat.metalness, 0.05);
      this.mat.color.lerp(new Color(0x3aa0d8), 0.35);
      this.mat.depthWrite = false;
      this.mat.side = DoubleSide;
    }

    if (this.emitLight) {
      this.mat.emissive.copy(this.color);
      this.mat.emissiveIntensity = Math.max(this.mat.emissiveIntensity, 0.9);
    }

    this.mat.side =
      this.doubleSided || this.isWater ? DoubleSide : FrontSide;

    const opaque = this.mat.opacity > 0.85;
    this.mesh.castShadow = this.castShadow && opaque;
    this.mesh.receiveShadow = true;
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

  /** Break this part in play (hides mesh; caller rebuilds collision). */
  breakApart() {
    if (this.destroyed || this.name === "Baseplate") return false;
    this.destroyed = true;
    this.canCollide = false;
    this.sync();
    return true;
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
  opts?: {
    canCollide?: boolean;
    material?: PartMaterial;
    shape?: PartShape;
    anchored?: boolean;
  },
): Part {
  const p = new Part(name);
  if (opts?.shape) p.shape = opts.shape;
  p.setSize(sx, sy, sz).setPosition(cx, cy, cz).setColor(color);
  if (opts?.canCollide === false) p.setCanCollide(false);
  if (opts?.material) p.setMaterial(opts.material);
  if (opts?.anchored === false) p.anchored = false;
  return p;
}

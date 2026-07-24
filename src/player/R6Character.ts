import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  DEFAULT_FACE_TEXTURE_ID,
  resolveFaceTexture,
} from "../assets/FaceTextures";
import type { EmotePose } from "../emotes/emotes";

/** Shared R6 vertical size — torso, arms, and legs all match. */
const PART_HEIGHT = 2;

/** R6-ish stud sizes (1 unit ≈ 1 stud). */
export const SIZE = {
  torso: new Vector3(2, PART_HEIGHT, 1),
  /** Head ~1.1× arm width (arm is 1 stud). */
  headRadius: 0.55,
  headHeight: 1.06,
  arm: new Vector3(1, PART_HEIGHT, 1),
  leg: new Vector3(1, PART_HEIGHT, 1),
} as const;

const CORNER = 0.16;
const SEGMENTS = 8;
const NEST = 0.08;

export type LimbName =
  | "Torso"
  | "Head"
  | "LeftArm"
  | "RightArm"
  | "LeftLeg"
  | "RightLeg";

export interface PartSettings {
  meshAffectedByMaterial: boolean;
  advancedCollision: boolean;
  anchorPoint: Vector3;
  canCollide: boolean;
}

function defaultSettings(canCollide: boolean): PartSettings {
  return {
    meshAffectedByMaterial: true,
    advancedCollision: true,
    anchorPoint: new Vector3(0, 0, 0),
    canCollide,
  };
}

function createLimbGeometry(size: Vector3) {
  return new RoundedBoxGeometry(size.x, size.y, size.z, SEGMENTS, CORNER);
}

/**
 * Official-style head mesh: upright cylinder with smoothly rounded rim edges.
 */
export function createHeadMeshGeometry(
  radius = SIZE.headRadius,
  height = SIZE.headHeight,
  edge = 0.18,
): BufferGeometry {
  const r = radius;
  const h = height;
  const e = Math.min(edge, r * 0.45, h * 0.35);
  const pts: Vector2[] = [];
  const curveSteps = 10;

  // Bottom center → bottom flat → bottom fillet → side → top fillet → top flat → top center
  pts.push(new Vector2(0, -h / 2));
  pts.push(new Vector2(r - e, -h / 2));

  for (let i = 0; i <= curveSteps; i++) {
    const t = i / curveSteps;
    const a = -Math.PI / 2 + t * (Math.PI / 2); // -90° → 0°
    pts.push(
      new Vector2(r - e + Math.cos(a) * e, -h / 2 + e + Math.sin(a) * e),
    );
  }

  pts.push(new Vector2(r, h / 2 - e));

  for (let i = 0; i <= curveSteps; i++) {
    const t = i / curveSteps;
    const a = t * (Math.PI / 2); // 0° → 90°
    pts.push(
      new Vector2(r - e + Math.cos(a) * e, h / 2 - e + Math.sin(a) * e),
    );
  }

  pts.push(new Vector2(0, h / 2));

  const geometry = new LatheGeometry(pts, 48);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Face wrap that follows the head cylinder (no floating plane / gap).
 * Texture is selected by asset id (editor can swap via setFaceTextureId).
 */
export class FaceDecal {
  readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;
  private textureId: string;

  constructor(textureId: string = DEFAULT_FACE_TEXTURE_ID) {
    this.material = new MeshBasicMaterial({
      map: resolveFaceTexture(textureId),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Same radius as head — wraps the front; tiny scale avoids z-fight only
    const radius = SIZE.headRadius * 1.001;
    const height = SIZE.headHeight - 0.36; // sit on the straight band (inside rounded rims)
    // Match arc length to height so UVs stay ~1:1 (no stretch)
    const arc = height / SIZE.headRadius;
    const geometry = new CylinderGeometry(
      radius,
      radius,
      height,
      48,
      1,
      true,
      -arc / 2,
      arc,
    );

    this.mesh = new Mesh(geometry, this.material);
    this.mesh.name = "Face";
    // Flush on head surface (no Z padding)
    this.mesh.position.set(0, 0, 0);
    this.textureId = textureId;
  }

  getFaceTextureId() {
    return this.textureId;
  }

  /** Select a face from the catalog (or a later editor-registered custom id). */
  setFaceTextureId(id: string) {
    this.textureId = id;
    this.material.map = resolveFaceTexture(id);
    this.material.needsUpdate = true;
  }

  setOpacity(opacity: number) {
    const o = Math.min(1, Math.max(0, opacity));
    this.material.opacity = o;
    this.material.transparent = true;
    this.mesh.visible = o > 0.02;
  }
}

export class EnginePart {
  readonly name: LimbName;
  readonly mesh: Mesh;
  readonly settings: PartSettings;
  private readonly baseColor: Color;

  constructor(
    name: LimbName,
    color: number,
    canCollide: boolean,
    geometry: BufferGeometry,
  ) {
    this.name = name;
    this.settings = defaultSettings(canCollide);
    this.baseColor = new Color(color);

    const material = new MeshStandardMaterial({
      color: this.baseColor.clone(),
      roughness: 0.72,
      metalness: 0.0,
      envMapIntensity: 0.35,
      flatShading: false,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.name = name;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  setColor(hex: number) {
    this.baseColor.set(hex);
    this.applyAppearance();
  }

  /** Current base color as a 0xRRGGBB integer. */
  getColorHex(): number {
    return this.baseColor.getHex();
  }

  setMaterialPreset(preset: "plastic" | "metal") {
    const mat = this.mesh.material as MeshStandardMaterial;
    if (preset === "metal") {
      mat.metalness = 0.55;
      mat.roughness = 0.45;
    } else {
      mat.metalness = 0.0;
      mat.roughness = 0.72;
    }
    this.applyAppearance();
  }

  /** 0 = invisible (first person), 1 = fully opaque. */
  setOpacity(opacity: number) {
    const mat = this.mesh.material as MeshStandardMaterial;
    const o = Math.min(1, Math.max(0, opacity));
    mat.transparent = o < 0.999;
    mat.opacity = o;
    mat.depthWrite = o > 0.9;
    mat.needsUpdate = true;
    this.mesh.visible = o > 0.02;
    this.mesh.castShadow = o > 0.45;
  }

  applyAppearance() {
    const mat = this.mesh.material as MeshStandardMaterial;
    if (this.settings.meshAffectedByMaterial) {
      mat.color.copy(this.baseColor);
    } else {
      mat.color.set(0xb0b0b0);
      mat.metalness = 0.0;
      mat.roughness = 0.78;
    }
  }
}

/**
 * R6 player: invisible RootPart at torso center.
 * Head uses official smooth-edged cylinder Head mesh.
 * Limbs hang from joint pivots for walk animation.
 */
export class R6Character {
  readonly root: Object3D;
  readonly parts: Record<LimbName, EnginePart>;
  /** Root Y when standing on ground (y=0). */
  readonly groundedRootY: number;
  /** Front face decal — texture selectable for editor. */
  readonly face: FaceDecal;

  private readonly joints: {
    leftArm: Group;
    rightArm: Group;
    leftLeg: Group;
    rightLeg: Group;
  };
  private readonly armRest = {
    left: new Vector3(),
    right: new Vector3(),
  };
  private readonly legRest = {
    left: new Vector3(),
    right: new Vector3(),
  };
  /** Shoulder height while jumping — lower joint, same raise angle. */
  private readonly armJumpY = SIZE.torso.y * 0.22;
  private walkPhase = 0;
  private airLegPhase = 0;
  private animWeight = 0;
  private airBlend = 0;
  private fallBlend = 0;
  /** Time continuously airborne — delays fall/air pose on tiny steps. */
  private airTime = 0;

  constructor(faceTextureId: string = DEFAULT_FACE_TEXTURE_ID) {
    this.root = new Group();
    this.root.name = "RootPart";

    this.parts = {
      Torso: new EnginePart(
        "Torso",
        0x0b4da2,
        true,
        createLimbGeometry(SIZE.torso),
      ),
      Head: new EnginePart("Head", 0xf5c518, true, createHeadMeshGeometry()),
      LeftArm: new EnginePart(
        "LeftArm",
        0xf5c518,
        false,
        createLimbGeometry(SIZE.arm),
      ),
      RightArm: new EnginePart(
        "RightArm",
        0xf5c518,
        false,
        createLimbGeometry(SIZE.arm),
      ),
      LeftLeg: new EnginePart(
        "LeftLeg",
        0x3d8c40,
        true,
        createLimbGeometry(SIZE.leg),
      ),
      RightLeg: new EnginePart(
        "RightLeg",
        0x3d8c40,
        true,
        createLimbGeometry(SIZE.leg),
      ),
    };

    const torso = this.parts.Torso.mesh;
    this.root.add(torso);

    const head = this.parts.Head.mesh;
    head.position.set(0, SIZE.torso.y / 2 + SIZE.headHeight / 2 - NEST, 0);
    this.face = new FaceDecal(faceTextureId);
    head.add(this.face.mesh);
    torso.add(head);

    // Idle shoulders: top of arm flush with torso top, depth centered with torso
    const shoulderYIdle = SIZE.torso.y / 2;
    const leftArm = new Group();
    leftArm.position.set(-SIZE.torso.x / 2, shoulderYIdle, 0);
    this.parts.LeftArm.mesh.position.set(-SIZE.arm.x / 2, -SIZE.arm.y / 2, 0);
    leftArm.add(this.parts.LeftArm.mesh);
    torso.add(leftArm);

    const rightArm = new Group();
    rightArm.position.set(SIZE.torso.x / 2, shoulderYIdle, 0);
    this.parts.RightArm.mesh.position.set(SIZE.arm.x / 2, -SIZE.arm.y / 2, 0);
    rightArm.add(this.parts.RightArm.mesh);
    torso.add(rightArm);

    const leftLeg = new Group();
    leftLeg.position.set(-SIZE.leg.x / 2, -SIZE.torso.y / 2 + NEST, 0);
    this.parts.LeftLeg.mesh.position.set(0, -SIZE.leg.y / 2, 0);
    leftLeg.add(this.parts.LeftLeg.mesh);
    torso.add(leftLeg);

    const rightLeg = new Group();
    rightLeg.position.set(SIZE.leg.x / 2, -SIZE.torso.y / 2 + NEST, 0);
    this.parts.RightLeg.mesh.position.set(0, -SIZE.leg.y / 2, 0);
    rightLeg.add(this.parts.RightLeg.mesh);
    torso.add(rightLeg);

    this.joints = { leftArm, rightArm, leftLeg, rightLeg };
    this.armRest.left.copy(leftArm.position);
    this.armRest.right.copy(rightArm.position);
    this.legRest.left.copy(leftLeg.position);
    this.legRest.right.copy(rightLeg.position);

    this.groundedRootY = SIZE.leg.y + SIZE.torso.y / 2 - NEST;
    this.root.position.y = this.groundedRootY;
  }

  /**
   * Full torso AABB in XZ, oriented by facing (no front gap).
   * Y spans feet → head top. Rotation overlaps are pushed back by CollisionWorld.
   */
  getCollider(facing = 0) {
    const hx = SIZE.torso.x * 0.5;
    const hz = SIZE.torso.z * 0.5;
    const c = Math.abs(Math.cos(facing));
    const s = Math.abs(Math.sin(facing));
    const headTop = SIZE.torso.y * 0.5 + SIZE.headHeight - NEST;
    return {
      halfX: c * hx + s * hz,
      halfZ: s * hx + c * hz,
      bottom: -this.groundedRootY,
      top: headTop,
    };
  }

  /**
   * Walk cycle + classic jump/fall (arms up).
   * Fall is abrupt with arms popping slightly off the sockets.
   */
  updateAnimation(
    dt: number,
    moveSpeed: number,
    grounded: boolean,
    velocityY = 0,
    /** 0 = none, 1 = peak lunge pose */
    lungeWeight = 0,
    /** 1 = Roblox tool hold (arm out 90°, sword up) */
    toolHold = 0,
    /** 0 = hold, 1 = arm swung down to idle (slash) */
    slashWeight = 0,
  ) {
    const targetWalk = Math.min(1, Math.max(0, (moveSpeed - 0.35) / 8));
    const weightBlend = 1 - Math.exp(-10 * dt);
    this.animWeight += (targetWalk - this.animWeight) * weightBlend;

    const airborne = !grounded;
    if (grounded) this.airTime = 0;
    else this.airTime += dt;

    // Wait before air/fall poses so step-ups & tiny gaps don't flap arms.
    // Real jumps (clear upward speed) skip the wait.
    const AIR_ANIM_DELAY = 0.16;
    const realJump = velocityY > 5;
    const airReady = realJump || this.airTime >= AIR_ANIM_DELAY;
    const falling = airReady && airborne && velocityY < -0.8;

    // Fast ease-out into jump/fall (snappy start, soft settle)
    const targetAir = airReady && airborne ? 1 : 0;
    if (targetAir > this.airBlend) {
      this.airBlend +=
        (1 - this.airBlend) * (1 - Math.exp(-18 * dt));
      if (this.airBlend > 0.995) this.airBlend = 1;
    } else if (targetAir < this.airBlend) {
      this.airBlend = Math.max(0, this.airBlend - 10 * dt);
    }

    const targetFall = falling ? 1 : 0;
    if (targetFall > this.fallBlend) {
      this.fallBlend +=
        (1 - this.fallBlend) * (1 - Math.exp(-26 * dt));
      if (this.fallBlend > 0.995) this.fallBlend = 1;
    } else {
      this.fallBlend = Math.max(0, this.fallBlend - 12 * dt);
    }

    // Walk keeps running (arms use it on ground)
    if (this.animWeight > 0.02) {
      this.walkPhase += dt * (6.5 + this.animWeight * 5);
    }
    if (airborne || this.airBlend > 0.01) {
      this.airLegPhase += dt * 2.1;
    }

    const swing = Math.sin(this.walkPhase) * 0.7 * this.animWeight;
    const armSwing = swing * 0.95;

    const f = this.fallBlend;
    const a = Math.max(this.airBlend, f);

    // Raised pose angle (joint height is separate)
    const armsUp = -Math.PI * 0.95;
    const armOut = 0.05;

    const leftArmWalk = armSwing;
    const rightArmWalk = -armSwing;

    // Ground walk
    const walkLeftLeg = -swing;
    const walkRightLeg = swing;
    // Air: forward/back hip sway + sideways slide (no tilt / Z rotate)
    const t = this.airLegPhase;
    const airLeftLeg = Math.sin(t) * 0.38;
    const airRightLeg = Math.sin(t + 1.7) * 0.38;
    const airLeftSide = Math.sin(t * 0.85 + 0.4) * 0.05;
    const airRightSide = Math.sin(t * 0.9 + 2.1) * 0.05;

    const leftLegTarget = walkLeftLeg * (1 - a) + airLeftLeg * a;
    const rightLegTarget = walkRightLeg * (1 - a) + airRightLeg * a;

    const rotBlend = 1 - Math.exp(-(16 + 22 * f) * dt);
    const posBlend = 1 - Math.exp(-(18 + 20 * f) * dt);
    /** Ground arm moves — linear step cap. */
    const ARM_UP_RAD_PER_SEC = 32;
    /** Air arm raise — fast ease-out into arms-up. */
    const armAirEase = 1 - Math.exp(-20 * dt);

    const moveLinear = (current: number, target: number, maxStep: number) => {
      const delta = target - current;
      if (Math.abs(delta) <= maxStep) return target;
      return current + Math.sign(delta) * maxStep;
    };

    const { leftArm, rightArm, leftLeg, rightLeg } = this.joints;

    if (airReady && airborne) {
      leftArm.rotation.x += (armsUp - leftArm.rotation.x) * armAirEase;
      rightArm.rotation.x += (armsUp - rightArm.rotation.x) * armAirEase;
      leftArm.rotation.z += (-armOut - leftArm.rotation.z) * armAirEase;
      rightArm.rotation.z += (armOut - rightArm.rotation.z) * armAirEase;
    } else {
      // On ground: walk, Roblox 90° hold, slash down to idle, or lunge thrust
      const downStep = ARM_UP_RAD_PER_SEC * 1.15 * dt;
      const holdArm = -Math.PI / 2; // hand pointing forward at 90°
      const idleArm = 0; // hanging idle — slash target
      // Lunge keeps the hold angle (no rotate-up) — forward comes from position thrust
      const lungeArm = holdArm;
      const held = rightArmWalk * (1 - toolHold) + holdArm * toolHold;
      const afterSlash = held * (1 - slashWeight) + idleArm * slashWeight;
      const rightTarget =
        afterSlash * (1 - lungeWeight) + lungeArm * lungeWeight;
      leftArm.rotation.x = moveLinear(leftArm.rotation.x, leftArmWalk, downStep);
      const fast =
        lungeWeight > 0.05 || slashWeight > 0.05 || toolHold > 0.05;
      rightArm.rotation.x = moveLinear(
        rightArm.rotation.x,
        rightTarget,
        downStep * (fast ? 2.8 : 1),
      );
      leftArm.rotation.z = moveLinear(leftArm.rotation.z, 0, downStep * 0.5);
      const holdRoll = -0.12 * toolHold * (1 - slashWeight);
      rightArm.rotation.z = moveLinear(
        rightArm.rotation.z,
        holdRoll,
        downStep * (slashWeight > 0.05 ? 2.5 : 1),
      );
    }

    leftLeg.rotation.x += (leftLegTarget - leftLeg.rotation.x) * rotBlend;
    rightLeg.rotation.x += (rightLegTarget - rightLeg.rotation.x) * rotBlend;
    // No leg tilt
    leftLeg.rotation.z += (0 - leftLeg.rotation.z) * rotBlend;
    rightLeg.rotation.z += (0 - rightLeg.rotation.z) * rotBlend;

    // Drop shoulder joints lower while airborne (not the raise angle)
    const shoulderY =
      this.armRest.left.y * (1 - a) + this.armJumpY * a;

    // After a 90° hold swing, the arm sits 0.5 up and 0.5 forward of the
    // shoulder socket — nudge it back so top/back edges match the torso.
    const holdAlign = toolHold * (1 - slashWeight);
    const alignY = -SIZE.arm.z * 0.5 * holdAlign;
    const alignZ = -SIZE.arm.z * 0.5 * holdAlign;
    const lungeReach = 0.45 * lungeWeight;

    leftArm.position.x += (this.armRest.left.x - leftArm.position.x) * posBlend;
    leftArm.position.y += (shoulderY - leftArm.position.y) * posBlend;
    leftArm.position.z += (this.armRest.left.z - leftArm.position.z) * posBlend;
    rightArm.position.x += (this.armRest.right.x - rightArm.position.x) * posBlend;

    const rightY = shoulderY + alignY;
    const rightZ = this.armRest.right.z + alignZ + lungeReach;
    // Snap when fully holding so the shoulder seats exactly
    if (holdAlign > 0.85 && lungeWeight < 0.05) {
      rightArm.position.y = rightY;
      rightArm.position.z = rightZ;
    } else {
      rightArm.position.y += (rightY - rightArm.position.y) * posBlend;
      rightArm.position.z += (rightZ - rightArm.position.z) * posBlend;
    }

    // Sideways joint shift (translate hips, don't rotate/tilt)
    const leftLegX = this.legRest.left.x - airLeftSide * a;
    const rightLegX = this.legRest.right.x + airRightSide * a;
    leftLeg.position.x += (leftLegX - leftLeg.position.x) * posBlend;
    rightLeg.position.x += (rightLegX - rightLeg.position.x) * posBlend;
    leftLeg.position.y += (this.legRest.left.y - leftLeg.position.y) * posBlend;
    rightLeg.position.y += (this.legRest.right.y - rightLeg.position.y) * posBlend;
    leftLeg.position.z += (this.legRest.left.z - leftLeg.position.z) * posBlend;
    rightLeg.position.z += (this.legRest.right.z - rightLeg.position.z) * posBlend;

    // Ease the torso back to neutral (an emote may have left it leaned / bobbed).
    const torso = this.parts.Torso.mesh;
    const tk = 1 - Math.exp(-12 * dt);
    torso.rotation.x += (0 - torso.rotation.x) * tk;
    torso.rotation.y += (0 - torso.rotation.y) * tk;
    torso.rotation.z += (0 - torso.rotation.z) * tk;
    torso.position.y += (0 - torso.position.y) * tk;
    torso.position.x += (0 - torso.position.x) * tk;
  }

  /**
   * Drive the body from a chat emote pose (see src/emotes). Eases the shoulder
   * and hip joints toward the target while keeping the limbs seated in their
   * rest sockets, plus a little torso lean / twist / bounce. Runs instead of
   * {@link updateAnimation} while an emote is active and the player is idle.
   */
  applyEmotePose(dt: number, pose: EmotePose) {
    const k = 1 - Math.exp(-16 * dt);
    const swing = (j: Object3D, tx: number, tz: number) => {
      j.rotation.x += (tx - j.rotation.x) * k;
      j.rotation.z += (tz - j.rotation.z) * k;
    };
    const seat = (j: Object3D, restPos: Vector3) => {
      j.position.x += (restPos.x - j.position.x) * k;
      j.position.y += (restPos.y - j.position.y) * k;
      j.position.z += (restPos.z - j.position.z) * k;
    };

    const { leftArm, rightArm, leftLeg, rightLeg } = this.joints;
    swing(leftArm, pose.leftArm.x, pose.leftArm.z);
    swing(rightArm, pose.rightArm.x, pose.rightArm.z);
    swing(leftLeg, pose.leftLeg.x, pose.leftLeg.z);
    swing(rightLeg, pose.rightLeg.x, pose.rightLeg.z);
    seat(leftArm, this.armRest.left);
    seat(rightArm, this.armRest.right);
    seat(leftLeg, this.legRest.left);
    seat(rightLeg, this.legRest.right);

    const torso = this.parts.Torso.mesh;
    torso.rotation.x += (pose.torsoRx - torso.rotation.x) * k;
    torso.rotation.y += (pose.torsoRy - torso.rotation.y) * k;
    torso.rotation.z += (pose.torsoRz - torso.rotation.z) * k;
    torso.position.y += (pose.bob - torso.position.y) * k;
    torso.position.x += (pose.shiftX - torso.position.x) * k;
  }

  /** @deprecated use updateAnimation */
  updateWalk(dt: number, moveSpeed: number, grounded: boolean) {
    this.updateAnimation(dt, moveSpeed, grounded, 0);
  }

  /** Editor/runtime: swap face by catalog id (`classic-smile`, `blank`, or registered). */
  setFaceTextureId(id: string) {
    this.face.setFaceTextureId(id);
  }

  getFaceTextureId() {
    return this.face.getFaceTextureId();
  }

  /**
   * First-person body fade. 1 = solid, 0 = fully hidden.
   * Head/face can fade harder so you never see them when looking down.
   */
  setFirstPersonFade(bodyOpacity: number, headOpacity = bodyOpacity) {
    for (const [name, part] of Object.entries(this.parts)) {
      if (name === "Head") part.setOpacity(headOpacity);
      else part.setOpacity(bodyOpacity);
    }
    this.face.setOpacity(headOpacity);
  }

  /** World-space eye point (center of head). */
  getEyeWorldPosition(out = new Vector3()) {
    this.parts.Head.mesh.getWorldPosition(out);
    return out;
  }

  /** Attach a tool mesh to the right hand (e.g. classic sword). */
  setRightHandTool(tool: Object3D | null) {
    const arm = this.parts.RightArm.mesh;
    const prev = arm.getObjectByName("HandTool");
    if (prev) arm.remove(prev);
    if (!tool) return;
    tool.name = "HandTool";
    // Palm center (bottom face of arm block)
    tool.position.set(0, -SIZE.arm.y / 2, 0);
    this.setSwordBladeUp();
    arm.add(tool);
  }

  setRightHandToolVisible(visible: boolean) {
    const tool = this.parts.RightArm.mesh.getObjectByName("HandTool");
    if (tool) tool.visible = visible;
  }

  /**
   * Hold: blade skyward. Arm at 90° forward (rot.x = -π/2);
   * sword -Y → arm +Z → world up.
   */
  setSwordBladeUp() {
    const tool = this.parts.RightArm.mesh.getObjectByName("HandTool");
    if (!tool) return;
    tool.rotation.set(-Math.PI / 2, 0, 0);
  }

  /** Lunge: blade snaps along the arm (local -Y), no smoothing. */
  setSwordBladeAlongArm() {
    const tool = this.parts.RightArm.mesh.getObjectByName("HandTool");
    if (!tool) return;
    tool.rotation.set(0, 0, 0);
  }

  /** Instant sword orientation — no tween. */
  syncSwordOrientation(lunging: boolean) {
    if (lunging) this.setSwordBladeAlongArm();
    else this.setSwordBladeUp();
  }

  getObject3D() {
    return this.root;
  }
}

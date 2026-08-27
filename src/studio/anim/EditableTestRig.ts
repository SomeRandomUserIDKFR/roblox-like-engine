import type { EmotePose } from "../../emotes/emotes";
import type { Animation, RigKeyframe } from "../../instances/Animation";
import type { Instance } from "../../instances/Instance";
import { Model } from "../../instances/Model";
import { makePart, Part } from "../../instances/Part";
import { SIZE } from "../../player/R6Character";
import type { Workspace } from "../../instances/Workspace";

export const TEST_RIG_MODEL_NAME = "AnimationTestRig";

export type RigLimb =
  | "Torso"
  | "Head"
  | "LeftArm"
  | "RightArm"
  | "LeftLeg"
  | "RightLeg";

const LIMB_COLORS: Record<RigLimb, number> = {
  Torso: 0x3d7eff,
  Head: 0xf5d0a9,
  LeftArm: 0x6aa84f,
  RightArm: 0xe69138,
  LeftLeg: 0x6fa8dc,
  RightLeg: 0x8e7cc3,
};

/**
 * Studio-only physical R6 proxy: each limb is a real Part (selectable / movable).
 * Rotations map to animation keyframes; never saved in place snapshots.
 */
export class EditableTestRig {
  readonly model: Model;
  readonly parts: Record<RigLimb, Part>;
  readonly animation: Animation;

  private readonly originX: number;
  private readonly originZ: number;
  private readonly torsoRestY: number;

  constructor(
    workspace: Workspace,
    animation: Animation,
    origin: { x: number; y: number; z: number },
  ) {
    this.animation = animation;
    this.originX = origin.x;
    this.originZ = origin.z;
    this.torsoRestY = origin.y + 3;

    this.model = new Model(TEST_RIG_MODEL_NAME);
    this.model.setParent(workspace);

    const mk = (
      name: RigLimb,
      sx: number,
      sy: number,
      sz: number,
      color: number,
      shape?: "Block" | "Ball" | "Cylinder",
    ) => {
      const p = makePart(name, 0, 0, 0, sx, sy, sz, color, {
        material: "SmoothPlastic",
        canCollide: false,
        shape: shape ?? "Block",
      });
      p.isTestRig = true;
      p.anchored = true;
      p.locked = false;
      p.canQuery = true;
      p.sync();
      workspace.addPart(p, this.model);
      return p;
    };

    this.parts = {
      Torso: mk(
        "Torso",
        SIZE.torso.x,
        SIZE.torso.y,
        SIZE.torso.z,
        LIMB_COLORS.Torso,
      ),
      Head: mk(
        "Head",
        SIZE.headRadius * 2,
        SIZE.headHeight,
        SIZE.headRadius * 2,
        LIMB_COLORS.Head,
        "Cylinder",
      ),
      LeftArm: mk(
        "LeftArm",
        SIZE.arm.x,
        SIZE.arm.y,
        SIZE.arm.z,
        LIMB_COLORS.LeftArm,
      ),
      RightArm: mk(
        "RightArm",
        SIZE.arm.x,
        SIZE.arm.y,
        SIZE.arm.z,
        LIMB_COLORS.RightArm,
      ),
      LeftLeg: mk(
        "LeftLeg",
        SIZE.leg.x,
        SIZE.leg.y,
        SIZE.leg.z,
        LIMB_COLORS.LeftLeg,
      ),
      RightLeg: mk(
        "RightLeg",
        SIZE.leg.x,
        SIZE.leg.y,
        SIZE.leg.z,
        LIMB_COLORS.RightLeg,
      ),
    };

    this.applyPose({
      leftArm: { x: 0, z: 0 },
      rightArm: { x: 0, z: 0 },
      leftLeg: { x: 0, z: 0 },
      rightLeg: { x: 0, z: 0 },
      torsoRx: 0,
      torsoRy: 0,
      torsoRz: 0,
      bob: 0,
      shiftX: 0,
    });
  }

  owns(inst: Instance | null | undefined): boolean {
    if (!inst) return false;
    if (inst === this.model) return true;
    if (inst instanceof Part && inst.isTestRig) {
      return Object.values(this.parts).includes(inst);
    }
    return false;
  }

  /** Read current limb transforms into a keyframe at `time`. */
  capturePose(time: number): RigKeyframe {
    const { Torso, LeftArm, RightArm, LeftLeg, RightLeg } = this.parts;
    return {
      time,
      leftArm: { x: LeftArm.rotation.x, z: LeftArm.rotation.z },
      rightArm: { x: RightArm.rotation.x, z: RightArm.rotation.z },
      leftLeg: { x: LeftLeg.rotation.x, z: LeftLeg.rotation.z },
      rightLeg: { x: RightLeg.rotation.x, z: RightLeg.rotation.z },
      torsoRx: Torso.rotation.x,
      torsoRy: Torso.rotation.y,
      torsoRz: Torso.rotation.z,
      bob: Torso.position.y - this.torsoRestY,
      shiftX: Torso.position.x - this.originX,
    };
  }

  /** Drive all proxy Parts from a sampled pose (scrub / play). */
  applyPose(pose: EmotePose | RigKeyframe) {
    const tx = this.originX + pose.shiftX;
    const ty = this.torsoRestY + pose.bob;
    const tz = this.originZ;

    const { Torso, Head, LeftArm, RightArm, LeftLeg, RightLeg } = this.parts;

    Torso.position.set(tx, ty, tz);
    Torso.rotation.set(pose.torsoRx, pose.torsoRy, pose.torsoRz);
    Torso.sync();

    Head.position.set(tx, ty + SIZE.torso.y * 0.5 + SIZE.headHeight * 0.5 - 0.08, tz);
    Head.rotation.set(pose.torsoRx * 0.25, pose.torsoRy, pose.torsoRz * 0.25);
    Head.sync();

    const armY = ty;
    const legY = ty - SIZE.torso.y * 0.5 - SIZE.leg.y * 0.5;
    const armX = SIZE.torso.x * 0.5 + SIZE.arm.x * 0.5;

    LeftArm.position.set(tx - armX, armY, tz);
    LeftArm.rotation.set(pose.leftArm.x, 0, pose.leftArm.z);
    LeftArm.sync();

    RightArm.position.set(tx + armX, armY, tz);
    RightArm.rotation.set(pose.rightArm.x, 0, pose.rightArm.z);
    RightArm.sync();

    LeftLeg.position.set(tx - 0.5, legY, tz);
    LeftLeg.rotation.set(pose.leftLeg.x, 0, pose.leftLeg.z);
    LeftLeg.sync();

    RightLeg.position.set(tx + 0.5, legY, tz);
    RightLeg.rotation.set(pose.rightLeg.x, 0, pose.rightLeg.z);
    RightLeg.sync();
  }

  dispose(workspace: Workspace) {
    for (const p of Object.values(this.parts)) {
      const i = workspace.parts.indexOf(p);
      if (i >= 0) workspace.parts.splice(i, 1);
      p.mesh.parent?.remove(p.mesh);
      p.setParent(null);
    }
    this.model.setParent(null);
  }
}

export function isTestRigInstance(inst: Instance | null): boolean {
  if (!inst) return false;
  if (inst instanceof Model && inst.name === TEST_RIG_MODEL_NAME) return true;
  if (inst instanceof Part && inst.isTestRig) return true;
  return false;
}

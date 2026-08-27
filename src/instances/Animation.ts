import type { EmotePose, LimbPose } from "../emotes/emotes";
import { Instance } from "./Instance";

/** One pose sample on the R6 test-rig timeline. */
export interface RigKeyframe {
  time: number;
  leftArm: LimbPose;
  rightArm: LimbPose;
  leftLeg: LimbPose;
  rightLeg: LimbPose;
  torsoRx: number;
  torsoRy: number;
  torsoRz: number;
  bob: number;
  shiftX: number;
}

function limb(x = 0, z = 0): LimbPose {
  return { x, z };
}

function restKey(time = 0): RigKeyframe {
  return {
    time,
    leftArm: limb(),
    rightArm: limb(),
    leftLeg: limb(),
    rightLeg: limb(),
    torsoRx: 0,
    torsoRy: 0,
    torsoRz: 0,
    bob: 0,
    shiftX: 0,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpLimb(a: LimbPose, b: LimbPose, t: number): LimbPose {
  return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) };
}

function lerpKey(a: RigKeyframe, b: RigKeyframe, t: number): EmotePose {
  return {
    leftArm: lerpLimb(a.leftArm, b.leftArm, t),
    rightArm: lerpLimb(a.rightArm, b.rightArm, t),
    leftLeg: lerpLimb(a.leftLeg, b.leftLeg, t),
    rightLeg: lerpLimb(a.rightLeg, b.rightLeg, t),
    torsoRx: lerp(a.torsoRx, b.torsoRx, t),
    torsoRy: lerp(a.torsoRy, b.torsoRy, t),
    torsoRz: lerp(a.torsoRz, b.torsoRz, t),
    bob: lerp(a.bob, b.bob, t),
    shiftX: lerp(a.shiftX, b.shiftX, t),
  };
}

/**
 * Keyframed R6 pose clip — sample with {@link Animation.sample}.
 */
export class Animation extends Instance {
  length = 1;
  looped = true;
  /** Higher plays over lower when multiple tracks exist (future). */
  priority = 0;
  keyframes: RigKeyframe[] = [];

  constructor(name = "Animation", keyframes?: RigKeyframe[]) {
    super(name);
    this.keyframes = keyframes ?? [restKey(0), restKey(1)];
    this.length = Math.max(
      0.05,
      ...this.keyframes.map((k) => k.time),
      this.length,
    );
  }

  /** Evaluate pose at time `t` (seconds). */
  sample(t: number): EmotePose {
    const keys = [...this.keyframes].sort((a, b) => a.time - b.time);
    if (keys.length === 0) return restKey(0);
    if (keys.length === 1) return { ...keys[0]!, leftArm: { ...keys[0]!.leftArm }, rightArm: { ...keys[0]!.rightArm }, leftLeg: { ...keys[0]!.leftLeg }, rightLeg: { ...keys[0]!.rightLeg } };

    let time = t;
    const len = Math.max(0.05, this.length);
    if (this.looped) {
      time = ((time % len) + len) % len;
    } else {
      time = Math.min(Math.max(0, time), len);
    }

    if (time <= keys[0]!.time) {
      const k = keys[0]!;
      return {
        leftArm: { ...k.leftArm },
        rightArm: { ...k.rightArm },
        leftLeg: { ...k.leftLeg },
        rightLeg: { ...k.rightLeg },
        torsoRx: k.torsoRx,
        torsoRy: k.torsoRy,
        torsoRz: k.torsoRz,
        bob: k.bob,
        shiftX: k.shiftX,
      };
    }
    const last = keys[keys.length - 1]!;
    if (time >= last.time) {
      return {
        leftArm: { ...last.leftArm },
        rightArm: { ...last.rightArm },
        leftLeg: { ...last.leftLeg },
        rightLeg: { ...last.rightLeg },
        torsoRx: last.torsoRx,
        torsoRy: last.torsoRy,
        torsoRz: last.torsoRz,
        bob: last.bob,
        shiftX: last.shiftX,
      };
    }

    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i]!;
      const b = keys[i + 1]!;
      if (time >= a.time && time <= b.time) {
        const span = Math.max(1e-6, b.time - a.time);
        const u = (time - a.time) / span;
        return lerpKey(a, b, u);
      }
    }
    return restKey(0);
  }
}

/** Classic wave clip for demos / ViewportFrame test rig. */
export function createWaveAnimation(name = "WaveAnim"): Animation {
  const anim = new Animation(name, [
    {
      time: 0,
      leftArm: limb(0, 0),
      rightArm: limb(-2.85, 0),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: 0,
      torsoRy: -0.05,
      torsoRz: 0,
      bob: 0,
      shiftX: 0,
    },
    {
      time: 0.25,
      leftArm: limb(0, 0),
      rightArm: limb(-2.85, 0.35),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: 0,
      torsoRy: -0.08,
      torsoRz: 0,
      bob: 0.02,
      shiftX: 0,
    },
    {
      time: 0.5,
      leftArm: limb(0, 0),
      rightArm: limb(-2.85, -0.35),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: 0,
      torsoRy: 0.05,
      torsoRz: 0,
      bob: 0,
      shiftX: 0,
    },
    {
      time: 0.75,
      leftArm: limb(0, 0),
      rightArm: limb(-2.85, 0.35),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: 0,
      torsoRy: -0.08,
      torsoRz: 0,
      bob: 0.02,
      shiftX: 0,
    },
    {
      time: 1,
      leftArm: limb(0, 0),
      rightArm: limb(-2.85, 0),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: 0,
      torsoRy: -0.05,
      torsoRz: 0,
      bob: 0,
      shiftX: 0,
    },
  ]);
  anim.length = 1;
  anim.looped = true;
  return anim;
}

/** Cheer-style arms-up clip. */
export function createCheerAnimation(name = "CheerAnim"): Animation {
  const anim = new Animation(name, [
    restKey(0),
    {
      time: 0.2,
      leftArm: limb(-2.9, -0.2),
      rightArm: limb(-2.9, 0.2),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: -0.08,
      torsoRy: 0,
      torsoRz: 0,
      bob: 0.15,
      shiftX: 0,
    },
    {
      time: 0.5,
      leftArm: limb(-2.7, -0.35),
      rightArm: limb(-2.7, 0.35),
      leftLeg: limb(0.1, 0),
      rightLeg: limb(-0.1, 0),
      torsoRx: -0.12,
      torsoRy: 0.1,
      torsoRz: 0,
      bob: 0.25,
      shiftX: 0.05,
    },
    {
      time: 0.8,
      leftArm: limb(-2.9, -0.2),
      rightArm: limb(-2.9, 0.2),
      leftLeg: limb(),
      rightLeg: limb(),
      torsoRx: -0.08,
      torsoRy: -0.1,
      torsoRz: 0,
      bob: 0.15,
      shiftX: -0.05,
    },
    restKey(1.1),
  ]);
  anim.length = 1.1;
  anim.looped = true;
  return anim;
}

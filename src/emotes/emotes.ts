/**
 * Classic R6 chat emotes (`/e dance`, `/e dance2`, …).
 *
 * R6 has no elbow/knee joints, so each emote is a procedural pose over time
 * expressed as shoulder/hip rotations plus a little torso lean/twist. Angles
 * follow the same conventions as R6Character:
 *   arm/leg rotation.x  — swing forward (negative) → overhead (~ -PI)
 *   arm rotation.z      — splay out to the side (right +, left -)
 */

export type EmoteName =
  | "wave"
  | "point"
  | "dance"
  | "dance2"
  | "dance3"
  | "cheer"
  | "laugh";

export const EMOTE_NAMES: readonly EmoteName[] = [
  "wave",
  "point",
  "dance",
  "dance2",
  "dance3",
  "cheer",
  "laugh",
];

export function isEmoteName(s: string): s is EmoteName {
  return (EMOTE_NAMES as readonly string[]).includes(s);
}

export interface LimbPose {
  x: number;
  z: number;
}

export interface EmotePose {
  leftArm: LimbPose;
  rightArm: LimbPose;
  leftLeg: LimbPose;
  rightLeg: LimbPose;
  /** Torso lean (back +), twist (y), roll (z), and a small vertical bounce. */
  torsoRx: number;
  torsoRy: number;
  torsoRz: number;
  bob: number;
}

function rest(): EmotePose {
  return {
    leftArm: { x: 0, z: 0 },
    rightArm: { x: 0, z: 0 },
    leftLeg: { x: 0, z: 0 },
    rightLeg: { x: 0, z: 0 },
    torsoRx: 0,
    torsoRy: 0,
    torsoRz: 0,
    bob: 0,
  };
}

/** Target pose for `name` at `t` seconds since the emote started. */
export function emotePose(name: EmoteName, t: number): EmotePose {
  const p = rest();
  switch (name) {
    case "wave": {
      // Right arm overhead, hand sweeping side to side.
      const w = Math.sin(t * 9);
      p.rightArm = { x: -2.8, z: 0.3 + 0.5 * w };
      p.leftArm = { x: -0.05, z: 0 };
      p.torsoRy = -0.06;
      return p;
    }
    case "point": {
      // Right arm out forward, steady with a subtle bob.
      const b = Math.sin(t * 3) * 0.05;
      p.rightArm = { x: -1.55 + b, z: 0.12 };
      p.torsoRy = -0.12;
      return p;
    }
    case "dance": {
      // Classic disco point — alternating arm up on the diagonal, hip twist.
      const s = Math.sin(t * 5);
      const rUp = Math.max(0, s);
      const lUp = Math.max(0, -s);
      p.rightArm = { x: -0.2 - 2.2 * rUp, z: 0.15 + 0.5 * rUp };
      p.leftArm = { x: -0.2 - 2.2 * lUp, z: -0.15 - 0.5 * lUp };
      p.leftLeg = { x: 0.14 * s, z: 0 };
      p.rightLeg = { x: -0.14 * s, z: 0 };
      p.torsoRy = 0.18 * s;
      p.bob = 0.06 * Math.abs(s);
      return p;
    }
    case "dance2": {
      // Both arms up, swaying left/right with a body roll.
      const sway = Math.sin(t * 3.4);
      p.leftArm = { x: -2.75, z: -0.45 + 0.55 * sway };
      p.rightArm = { x: -2.75, z: 0.45 + 0.55 * sway };
      p.leftLeg = { x: 0, z: -0.05 + 0.05 * sway };
      p.rightLeg = { x: 0, z: 0.05 + 0.05 * sway };
      p.torsoRz = 0.13 * sway;
      p.bob = 0.05 * (1 + Math.cos(t * 6.8)) * 0.5;
      return p;
    }
    case "dance3": {
      // Arms out to the sides, twisting front/back — the "twist".
      const s = Math.sin(t * 3.2);
      p.leftArm = { x: 0.55 * s, z: -1.25 };
      p.rightArm = { x: -0.55 * s, z: 1.25 };
      p.torsoRy = 0.4 * s;
      p.bob = 0.04 * Math.abs(s);
      return p;
    }
    case "cheer": {
      // Both arms overhead, shaking.
      const w = Math.sin(t * 11);
      p.leftArm = { x: -2.9, z: -0.2 - 0.22 * w };
      p.rightArm = { x: -2.9, z: 0.2 - 0.22 * w };
      p.bob = 0.05 * (1 + Math.sin(t * 11)) * 0.5;
      return p;
    }
    case "laugh": {
      // Lean back, hands to belly, shaking.
      const sh = Math.sin(t * 13) * 0.07;
      p.leftArm = { x: -0.6 + sh, z: -0.22 };
      p.rightArm = { x: -0.6 - sh, z: 0.22 };
      p.torsoRx = 0.33 + sh;
      return p;
    }
    default:
      return p;
  }
}

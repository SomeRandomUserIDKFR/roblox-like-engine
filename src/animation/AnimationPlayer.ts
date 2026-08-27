import type { EmotePose } from "../emotes/emotes";
import type { Animation } from "../instances/Animation";
import type { R6Character } from "../player/R6Character";

/** Plays an {@link Animation} on an R6Character (test rig or player). */
export class AnimationPlayer {
  time = 0;
  playing = true;
  speed = 1;

  constructor(
    private readonly character: R6Character,
    public animation: Animation | null = null,
  ) {}

  play(anim?: Animation) {
    if (anim) this.animation = anim;
    this.playing = true;
    this.time = 0;
  }

  stop() {
    this.playing = false;
  }

  seek(t: number) {
    this.time = Math.max(0, t);
    this.apply();
  }

  update(dt: number) {
    if (!this.playing || !this.animation) return;
    this.time += dt * this.speed;
    const len = Math.max(0.05, this.animation.length);
    if (this.animation.looped) {
      this.time = ((this.time % len) + len) % len;
    } else if (this.time >= len) {
      this.time = len;
      this.playing = false;
    }
    this.apply();
  }

  private apply() {
    if (!this.animation) return;
    const pose = this.animation.sample(this.time);
    this.character.snapToPose(pose);
  }

  /** Current sampled pose (for UI readout). */
  currentPose(): EmotePose | null {
    if (!this.animation) return null;
    return this.animation.sample(this.time);
  }
}

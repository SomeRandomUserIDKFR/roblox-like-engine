/**
 * Sword slash — arm swings down from the 90° hold toward idle, then returns.
 * Trigger with single left click while sword is equipped.
 */
export class SwordSlash {
  /** 0 = hold pose, 1 = arm fully down at idle. */
  weight = 0;
  private cooldown = 0;
  private phase: "idle" | "down" | "up" = "idle";
  private timer = 0;

  readonly downDuration = 0.13;
  readonly upDuration = 0.2;
  readonly cooldownDuration = 0.28;

  get canSlash() {
    return this.phase === "idle" && this.cooldown <= 0;
  }

  get busy() {
    return this.phase !== "idle";
  }

  tryStart() {
    if (!this.canSlash) return false;
    this.phase = "down";
    this.timer = 0;
    this.weight = 0;
    return true;
  }

  /** Cancel mid-slash (e.g. double-click becomes a lunge instead). */
  cancel() {
    this.phase = "idle";
    this.weight = 0;
    this.timer = 0;
  }

  update(dt: number) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.phase === "down") {
      this.timer += dt;
      const t = Math.min(1, this.timer / this.downDuration);
      this.weight = t;
      if (this.timer >= this.downDuration) {
        this.phase = "up";
        this.timer = 0;
      }
    } else if (this.phase === "up") {
      this.timer += dt;
      const t = Math.min(1, this.timer / this.upDuration);
      this.weight = 1 - t;
      if (this.timer >= this.upDuration) {
        this.phase = "idle";
        this.weight = 0;
        this.cooldown = this.cooldownDuration;
      }
    }
  }
}

/**
 * Classic sword lunge — short forward dash.
 * Trigger with double left-click while the sword is equipped.
 */
export class SwordLunge {
  /** 0 idle → peaks during dash → recovers. */
  weight = 0;
  private cooldown = 0;
  private phase: "idle" | "thrust" | "recover" = "idle";
  private timer = 0;

  readonly thrustDuration = 0.12;
  readonly recoverDuration = 0.28;
  readonly cooldownDuration = 0.5;
  readonly boostSpeed = 22;

  get canLunge() {
    return this.phase === "idle" && this.cooldown <= 0;
  }

  get busy() {
    return this.phase !== "idle";
  }

  tryStart() {
    if (!this.canLunge) return false;
    this.phase = "thrust";
    this.timer = 0;
    this.weight = 0;
    return true;
  }

  /**
   * @returns forward dash speed (studs/sec) while thrusting, else 0
   */
  update(dt: number): number {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

    let boost = 0;

    if (this.phase === "thrust") {
      this.timer += dt;
      const t = Math.min(1, this.timer / this.thrustDuration);
      this.weight = t;
      boost = this.boostSpeed * (1.05 - t * 0.2);
      if (this.timer >= this.thrustDuration) {
        this.phase = "recover";
        this.timer = 0;
      }
    } else if (this.phase === "recover") {
      this.timer += dt;
      const t = Math.min(1, this.timer / this.recoverDuration);
      this.weight = 1 - t;
      if (this.timer >= this.recoverDuration) {
        this.phase = "idle";
        this.weight = 0;
        this.cooldown = this.cooldownDuration;
      }
    }

    return boost;
  }
}

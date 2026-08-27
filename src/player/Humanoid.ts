import { Signal } from "../core/Signal";

export type HumanoidState =
  | "Running"
  | "Jumping"
  | "Freefall"
  | "Swimming"
  | "Dead";

/**
 * Character vitals + death. Wired to the local R6 in Play.
 */
export class Humanoid {
  MaxHealth = 100;
  Health = 100;
  WalkSpeed = 16;
  JumpPower = 50;
  DisplayDistanceType = "None";
  state: HumanoidState = "Running";

  readonly Died = new Signal<[]>();
  readonly HealthChanged = new Signal<[health: number]>();
  readonly StateChanged = new Signal<[state: HumanoidState]>();

  private dead = false;

  get IsDead() {
    return this.dead;
  }

  TakeDamage(amount: number) {
    if (this.dead || amount <= 0) return;
    this.Health = Math.max(0, this.Health - amount);
    this.HealthChanged.Fire(this.Health);
    if (this.Health <= 0) this.kill();
  }

  Heal(amount: number) {
    if (this.dead || amount <= 0) return;
    this.Health = Math.min(this.MaxHealth, this.Health + amount);
    this.HealthChanged.Fire(this.Health);
  }

  SetHealth(value: number) {
    if (this.dead) return;
    this.Health = Math.max(0, Math.min(this.MaxHealth, value));
    this.HealthChanged.Fire(this.Health);
    if (this.Health <= 0) this.kill();
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.Health = 0;
    this.state = "Dead";
    this.HealthChanged.Fire(0);
    this.StateChanged.Fire("Dead");
    this.Died.Fire();
  }

  /** Soft reset after respawn (does not fire Died). */
  reset() {
    this.dead = false;
    this.Health = this.MaxHealth;
    this.state = "Running";
    this.HealthChanged.Fire(this.Health);
    this.StateChanged.Fire("Running");
  }

  setState(state: HumanoidState) {
    if (this.dead || this.state === state) return;
    this.state = state;
    this.StateChanged.Fire(state);
  }
}

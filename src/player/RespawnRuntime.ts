import type { Humanoid } from "../player/Humanoid";
import type { PlayerMotor } from "../player/PlayerMotor";
import type { R6Character } from "../player/R6Character";
import { findSpawnPosition } from "../place/PlaceSnapshot";
import type { Workspace } from "../instances/Workspace";

const RESPAWN_DELAY = 3;

/**
 * Death → wait → teleport to Spawn / SpawnLocation → restore health.
 */
export class RespawnRuntime {
  private timer = -1;
  private overlay: HTMLElement | null = null;

  constructor(
    private readonly workspace: Workspace,
    private readonly character: R6Character,
    private readonly humanoid: Humanoid,
    private readonly motor: PlayerMotor,
  ) {
    humanoid.Died.Connect(() => this.onDied());
  }

  private onDied() {
    this.timer = RESPAWN_DELAY;
    this.showOverlay(`Respawning in ${Math.ceil(this.timer)}…`);
  }

  update(dt: number) {
    if (this.timer < 0) return;
    this.timer -= dt;
    this.showOverlay(
      this.timer > 0
        ? `Respawning in ${Math.ceil(this.timer)}…`
        : "Respawning…",
    );
    if (this.timer > 0) return;
    this.timer = -1;
    this.doRespawn();
  }

  private doRespawn() {
    const spawn = findSpawnPosition(this.workspace);
    this.character.root.position.set(spawn.x, spawn.y, spawn.z);
    this.motor.velocity.set(0, 0, 0);
    this.motor.velocityY = 0;
    this.humanoid.reset();
    this.hideOverlay();
  }

  /** Force respawn now (debug / scripts). */
  forceRespawn() {
    this.timer = -1;
    this.doRespawn();
  }

  private showOverlay(text: string) {
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.id = "polyx-respawn";
      Object.assign(this.overlay.style, {
        position: "fixed",
        inset: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        color: "#fff",
        fontFamily: "system-ui,sans-serif",
        fontSize: "28px",
        fontWeight: "600",
        zIndex: "50",
        pointerEvents: "none",
      });
      document.body.appendChild(this.overlay);
    }
    this.overlay.textContent = text;
    this.overlay.hidden = false;
  }

  private hideOverlay() {
    if (this.overlay) this.overlay.hidden = true;
  }

  dispose() {
    this.overlay?.remove();
    this.overlay = null;
  }
}

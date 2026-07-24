import type { R6Character } from "../player/R6Character";
import { SwordLunge } from "./SwordLunge";
import { SwordSlash } from "./SwordSlash";

const DOUBLE_CLICK_MS = 280;

/**
 * LMB single-click slash (delayed) / double-click lunge for the classic sword.
 */
export class SwordControls {
  readonly slash = new SwordSlash();
  readonly lunge = new SwordLunge();

  private lastLmbTime = 0;
  private slashDelayLeft = 0;
  private swordClick: "none" | "slash" | "lunge" = "none";

  constructor() {
    window.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const now = performance.now();
      if (now - this.lastLmbTime <= DOUBLE_CLICK_MS) {
        this.swordClick = "lunge";
        this.slashDelayLeft = 0;
        this.lastLmbTime = 0;
        this.slash.cancel();
      } else {
        this.lastLmbTime = now;
        this.slashDelayLeft = DOUBLE_CLICK_MS / 1000;
      }
    });
  }

  /**
   * @returns lunge boost speed this frame (0 if none)
   */
  update(
    dt: number,
    swordEquipped: boolean,
    grounded: boolean,
    character: R6Character,
  ): number {
    if (this.slashDelayLeft > 0) {
      this.slashDelayLeft -= dt;
      if (this.slashDelayLeft <= 0) {
        this.slashDelayLeft = 0;
        this.swordClick = "slash";
      }
    }

    if (this.swordClick === "slash") {
      this.swordClick = "none";
      if (swordEquipped && grounded) this.slash.tryStart();
    } else if (this.swordClick === "lunge") {
      this.swordClick = "none";
      if (swordEquipped && grounded) {
        this.slash.cancel();
        this.lunge.tryStart();
      }
    }

    if (swordEquipped) {
      this.slash.update(dt);
    } else {
      this.slash.cancel();
      this.lunge.weight = 0;
    }

    const lungeBoost = swordEquipped ? this.lunge.update(dt) : 0;
    if (!swordEquipped) {
      this.lunge.weight = 0;
    }

    if (swordEquipped) {
      character.syncSwordOrientation(this.lunge.busy);
    }

    return lungeBoost;
  }
}

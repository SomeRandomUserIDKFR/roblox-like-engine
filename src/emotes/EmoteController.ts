import type { EmoteName } from "./emotes";

/**
 * Tracks the currently playing chat emote and how long it has run.
 * Emotes loop until stopped (by movement, jumping, or `/e`).
 */
export class EmoteController {
  active = false;
  name: EmoteName = "dance";
  elapsed = 0;

  play(name: EmoteName) {
    this.name = name;
    this.elapsed = 0;
    this.active = true;
  }

  stop() {
    this.active = false;
  }

  tick(dt: number) {
    if (this.active) this.elapsed += dt;
  }
}

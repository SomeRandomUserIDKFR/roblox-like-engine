export type MoveKey =
  | "KeyW"
  | "KeyA"
  | "KeyS"
  | "KeyD"
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "KeyI"
  | "KeyO"
  | "Space"
  | "ShiftLeft"
  | "ShiftRight"
  | "Digit0"
  | "Digit1"
  | "Digit2"
  | "Digit3"
  | "Digit4"
  | "Digit5"
  | "Digit6"
  | "Digit7"
  | "Digit8"
  | "Digit9";

const TRACKED = new Set<string>([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyI",
  "KeyO",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Digit0",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
]);

function isTextFieldFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable)
  );
}

export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      // Ignore movement/hotbar keys while typing in a text field (e.g. the chat
      // command bar) so input goes to the field, not the character. keyup is
      // left unguarded so a key held before focusing never gets stuck down.
      if (isTextFieldFocused()) return;
      if (!TRACKED.has(e.code)) return;
      e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener("keyup", (e) => {
      this.down.delete(e.code);
      this.pressed.delete(e.code);
    });
    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });
  }

  isDown(code: MoveKey) {
    return this.down.has(code);
  }

  /** Either Shift key held. */
  isShiftDown() {
    return this.down.has("ShiftLeft") || this.down.has("ShiftRight");
  }

  /** True once per keydown (good for jump / toggles). */
  consumePress(code: MoveKey) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  /** True once when either Shift is pressed. */
  consumeShiftPress() {
    const left = this.consumePress("ShiftLeft");
    const right = this.consumePress("ShiftRight");
    return left || right;
  }

  /** True once for Digit0–Digit9. */
  consumeDigitPress(): number | null {
    for (let i = 0; i <= 9; i++) {
      if (this.consumePress(`Digit${i}` as MoveKey)) return i;
    }
    return null;
  }
}

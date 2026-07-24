import { EMOTE_NAMES, isEmoteName, type EmoteName } from "../emotes/emotes";

/**
 * Minimal Roblox-style chat command bar. Press `/` to open, type a command,
 * Enter to run, Esc to cancel. Currently understands `/e <emote>` (and bare
 * `/e` to stop). While the bar is focused, movement input is ignored (see
 * Input's text-field guard) so typing doesn't drive the character.
 */
export class ChatCommand {
  private readonly input: HTMLInputElement;
  private open = false;

  constructor(
    private readonly onEmote: (name: EmoteName) => void,
    private readonly onStop: () => void,
  ) {
    this.input = document.createElement("input");
    this.input.id = "chatbar";
    this.input.type = "text";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.setAttribute("aria-label", "Chat command");
    this.input.placeholder = `/e dance   ·   ${EMOTE_NAMES.join(", ")}`;
    this.input.style.display = "none";
    document.body.appendChild(this.input);
    this.bind();
  }

  private show() {
    this.open = true;
    this.input.style.display = "block";
    this.input.value = "/";
    this.input.focus();
    // caret at end
    const n = this.input.value.length;
    this.input.setSelectionRange(n, n);
  }

  private hide() {
    this.open = false;
    this.input.value = "";
    this.input.style.display = "none";
    this.input.blur();
  }

  private run() {
    const raw = this.input.value.trim().toLowerCase();
    const m = raw.match(/^\/e(?:\s+(\w+))?$/);
    if (m) {
      const name = m[1];
      if (!name) this.onStop();
      else if (isEmoteName(name)) this.onEmote(name);
    }
    this.hide();
  }

  private static typingElsewhere(): boolean {
    const el = document.activeElement as HTMLElement | null;
    return (
      !!el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable)
    );
  }

  private bind() {
    window.addEventListener("keydown", (e) => {
      if (this.open || e.key !== "/" || ChatCommand.typingElsewhere()) return;
      e.preventDefault();
      this.show();
    });

    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        this.run();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      }
    });

    this.input.addEventListener("blur", () => {
      if (this.open) this.hide();
    });
  }
}

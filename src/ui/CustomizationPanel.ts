import type { LimbName, R6Character } from "../player/R6Character";

const PARTS: { name: LimbName; label: string }[] = [
  { name: "Head", label: "Head" },
  { name: "Torso", label: "Torso" },
  { name: "LeftArm", label: "Left Arm" },
  { name: "RightArm", label: "Right Arm" },
  { name: "LeftLeg", label: "Left Leg" },
  { name: "RightLeg", label: "Right Leg" },
];

function toHexColor(hex: number): string {
  return "#" + hex.toString(16).padStart(6, "0");
}

/**
 * Character customization: an independent color picker per body part.
 * Toggle with the on-screen button or the "C" key.
 */
export class CustomizationPanel {
  private readonly panel: HTMLDivElement;
  private readonly inputs = new Map<LimbName, HTMLInputElement>();
  private readonly defaults = new Map<LimbName, number>();
  private open = false;

  constructor(private readonly character: R6Character) {
    for (const { name } of PARTS) {
      this.defaults.set(name, character.parts[name].getColorHex());
    }

    const toggle = document.createElement("button");
    toggle.id = "customize-toggle";
    toggle.type = "button";
    toggle.textContent = "Customize";
    toggle.addEventListener("click", () => this.setOpen(!this.open));
    document.body.appendChild(toggle);

    this.panel = document.createElement("div");
    this.panel.id = "customize-panel";
    this.panel.style.display = "none";

    const title = document.createElement("div");
    title.className = "customize-title";
    title.textContent = "Character Colors";
    this.panel.appendChild(title);

    for (const { name, label } of PARTS) {
      const row = document.createElement("label");
      row.className = "customize-row";

      const span = document.createElement("span");
      span.textContent = label;

      const input = document.createElement("input");
      input.type = "color";
      input.value = toHexColor(character.parts[name].getColorHex());
      input.addEventListener("input", () => {
        character.parts[name].setColor(parseInt(input.value.slice(1), 16));
      });

      this.inputs.set(name, input);
      row.appendChild(span);
      row.appendChild(input);
      this.panel.appendChild(row);
    }

    const actions = document.createElement("div");
    actions.className = "customize-actions";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => this.reset());

    const randomBtn = document.createElement("button");
    randomBtn.type = "button";
    randomBtn.textContent = "Randomize";
    randomBtn.addEventListener("click", () => this.randomize());

    actions.appendChild(resetBtn);
    actions.appendChild(randomBtn);
    this.panel.appendChild(actions);

    document.body.appendChild(this.panel);
    this.bindKey();
  }

  private setOpen(open: boolean) {
    this.open = open;
    this.panel.style.display = open ? "block" : "none";
  }

  private applyColor(name: LimbName, hex: number) {
    this.character.parts[name].setColor(hex);
    const input = this.inputs.get(name);
    if (input) input.value = toHexColor(hex);
  }

  private reset() {
    for (const { name } of PARTS) {
      this.applyColor(name, this.defaults.get(name) ?? 0xffffff);
    }
  }

  private randomize() {
    for (const { name } of PARTS) {
      this.applyColor(name, Math.floor(Math.random() * 0x1000000));
    }
  }

  private bindKey() {
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyC") return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      this.setOpen(!this.open);
    });
  }
}

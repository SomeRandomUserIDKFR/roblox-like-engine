import {
  Backpack,
  HOTBAR_ORDER,
  type HotbarSlotIndex,
} from "./Backpack";

/**
 * Hotbar HUD — only renders slots that contain an item.
 * Keys shown: 1–9, 0
 */
export class HotbarUI {
  readonly root: HTMLDivElement;
  private readonly backpack: Backpack;
  private readonly unsub: () => void;

  constructor(backpack: Backpack) {
    this.backpack = backpack;
    this.root = document.createElement("div");
    this.root.id = "hotbar";
    this.root.setAttribute("aria-label", "Hotbar");
    document.body.appendChild(this.root);

    this.unsub = backpack.onChange(() => this.render());
    this.render();
  }

  dispose() {
    this.unsub();
    this.root.remove();
  }

  private render() {
    const filled = this.backpack.getFilledHotbarSlots();
    const equipped = this.backpack.getEquippedSlot();

    this.root.replaceChildren();

    if (filled.length === 0) {
      this.root.classList.add("hotbar--empty");
      return;
    }
    this.root.classList.remove("hotbar--empty");

    for (const { slot, item } of filled) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hotbar-slot";
      if (equipped === slot) btn.classList.add("hotbar-slot--equipped");
      btn.title = item.name;
      btn.dataset.slot = String(slot);

      const key = document.createElement("span");
      key.className = "hotbar-slot__key";
      key.textContent = String(slot);

      const icon = document.createElement("span");
      icon.className = "hotbar-slot__icon";
      icon.textContent = item.icon ?? item.name.slice(0, 1).toUpperCase();
      if (item.color) icon.style.color = item.color;

      const name = document.createElement("span");
      name.className = "hotbar-slot__name";
      name.textContent = item.name;

      btn.append(key, icon, name);
      btn.addEventListener("click", () => this.backpack.equipSlot(slot));
      this.root.appendChild(btn);
    }
  }
}

/** Map keyboard Digit0–Digit9 → hotbar slot. */
export function hotbarSlotFromCode(code: string): HotbarSlotIndex | null {
  if (!code.startsWith("Digit")) return null;
  const n = Number(code.slice(5));
  if (!Number.isInteger(n) || n < 0 || n > 9) return null;
  return n as HotbarSlotIndex;
}

export { HOTBAR_ORDER };

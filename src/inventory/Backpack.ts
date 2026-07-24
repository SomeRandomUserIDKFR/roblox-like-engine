/**
 * Backpack + hotbar inventory.
 * Hotbar keys: 1–9 then 0 (Roblox-style). Empty slots are hidden in the UI.
 */

export type HotbarSlotIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Display / equip order on the bar. */
export const HOTBAR_ORDER: HotbarSlotIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export interface InventoryItem {
  id: string;
  name: string;
  /** Optional emoji/icon char for the prototype UI. */
  icon?: string;
  /** Accent color for the slot. */
  color?: string;
}

export class Backpack {
  /** Full backpack storage (not only hotbar). */
  readonly items = new Map<string, InventoryItem>();
  /** Hotbar: slot → item id (undefined = empty). */
  private readonly hotbar = new Map<HotbarSlotIndex, string>();
  private equipped: HotbarSlotIndex | null = null;
  private readonly listeners = new Set<() => void>();

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  addItem(item: InventoryItem) {
    this.items.set(item.id, item);
    this.notify();
  }

  removeItem(itemId: string) {
    this.items.delete(itemId);
    for (const [slot, id] of this.hotbar) {
      if (id === itemId) this.hotbar.delete(slot);
    }
    if (this.equipped !== null && this.hotbar.get(this.equipped) === undefined) {
      this.equipped = null;
    }
    this.notify();
  }

  /** Place item into a hotbar slot (replaces whatever was there). */
  setHotbarSlot(slot: HotbarSlotIndex, itemId: string | null) {
    if (itemId === null) {
      this.hotbar.delete(slot);
      if (this.equipped === slot) this.equipped = null;
    } else {
      if (!this.items.has(itemId)) {
        throw new Error(`Item "${itemId}" is not in the backpack`);
      }
      this.hotbar.set(slot, itemId);
    }
    this.notify();
  }

  /** First empty hotbar slot in order 1–9,0 — or null if full. */
  findEmptyHotbarSlot(): HotbarSlotIndex | null {
    for (const slot of HOTBAR_ORDER) {
      if (!this.hotbar.has(slot)) return slot;
    }
    return null;
  }

  /** Add to backpack and auto-fill next free hotbar slot. */
  give(item: InventoryItem): HotbarSlotIndex | null {
    this.items.set(item.id, item);
    const slot = this.findEmptyHotbarSlot();
    if (slot !== null) this.hotbar.set(slot, item.id);
    this.notify();
    return slot;
  }

  getHotbarItem(slot: HotbarSlotIndex): InventoryItem | null {
    const id = this.hotbar.get(slot);
    if (!id) return null;
    return this.items.get(id) ?? null;
  }

  /** Only slots that currently hold an item (for UI). */
  getFilledHotbarSlots(): { slot: HotbarSlotIndex; item: InventoryItem }[] {
    const out: { slot: HotbarSlotIndex; item: InventoryItem }[] = [];
    for (const slot of HOTBAR_ORDER) {
      const item = this.getHotbarItem(slot);
      if (item) out.push({ slot, item });
    }
    return out;
  }

  getEquippedSlot() {
    return this.equipped;
  }

  getEquippedItem(): InventoryItem | null {
    if (this.equipped === null) return null;
    return this.getHotbarItem(this.equipped);
  }

  /** Equip by hotbar key (0–9). Empty slot = unequip. */
  equipSlot(slot: HotbarSlotIndex) {
    if (!this.hotbar.has(slot)) {
      this.equipped = null;
      this.notify();
      return;
    }
    this.equipped = this.equipped === slot ? null : slot;
    this.notify();
  }
}

import { Backpack } from "./Backpack";

/** Demo loadout: sword on 1, apple on 2, block on 0. */
export function setupDemoBackpack(backpack: Backpack) {
  backpack.addItem({
    id: "sword",
    name: "Sword",
    icon: "⚔",
    color: "#f5c518",
  });
  backpack.addItem({ id: "apple", name: "Apple", icon: "🍎", color: "#ff6b5a" });
  backpack.addItem({ id: "block", name: "Block", icon: "🧱", color: "#6aa84f" });
  backpack.setHotbarSlot(1, "sword");
  backpack.setHotbarSlot(2, "apple");
  backpack.setHotbarSlot(0, "block");
}

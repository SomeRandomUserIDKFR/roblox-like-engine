import type { Object3D } from "three";
import type { Backpack } from "../inventory/Backpack";
import { createClassicSword } from "../items/ClassicSword";
import type { R6Character } from "../player/R6Character";
import { buildToolVisual, Tool } from "../instances/Tool";
import type { Workspace } from "../instances/Workspace";

/**
 * Collects place Tools into the backpack and syncs the held visual on equip.
 */
export class ToolRuntime {
  private readonly tools = new Map<string, Tool>();
  private readonly visuals = new Map<string, Object3D>();
  private sword: Object3D;
  private equippedToolId: string | null = null;
  private disposed = false;
  private unsub: (() => void) | null = null;

  constructor(
    private readonly workspace: Workspace,
    private readonly character: R6Character,
    private readonly backpack: Backpack,
  ) {
    this.sword = createClassicSword();
    this.character.setRightHandTool(this.sword);
    this.character.setRightHandToolVisible(false);
  }

  /** Hide world meshes for tool parts and register tools in the hotbar. */
  start() {
    let nextSlot = 3 as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

    for (const d of this.workspace.getDescendants()) {
      if (!(d instanceof Tool) || !d.enabled) continue;
      const id = `tool:${d.name}`;
      this.tools.set(id, d);

      for (const part of d.getParts()) {
        part.canCollide = false;
        part.mesh.visible = false;
      }

      this.backpack.addItem({
        id,
        name: d.displayName,
        icon: d.icon,
        color: d.color,
      });
      const empty = this.backpack.findEmptyHotbarSlot();
      const slot = empty ?? nextSlot;
      if (!this.backpack.getHotbarItem(slot)) {
        this.backpack.setHotbarSlot(slot, id);
      }
      nextSlot = ((slot === 0 ? 1 : slot + 1) % 10) as typeof nextSlot;
    }

    this.syncEquipped();
    this.unsub = this.backpack.onChange(() => this.syncEquipped());
  }

  /** Activate currently equipped place Tool (LMB). */
  activateEquipped() {
    if (!this.equippedToolId) return;
    this.tools.get(this.equippedToolId)?.fireActivated();
  }

  private syncEquipped() {
    if (this.disposed) return;
    const item = this.backpack.getEquippedItem();
    const nextId = item?.id ?? null;
    const nextToolId =
      nextId && this.tools.has(nextId) ? nextId : null;

    if (this.equippedToolId && this.equippedToolId !== nextToolId) {
      this.tools.get(this.equippedToolId)?.fireUnequipped();
    }

    if (nextToolId) {
      let visual = this.visuals.get(nextToolId);
      if (!visual) {
        visual = buildToolVisual(this.tools.get(nextToolId)!);
        this.visuals.set(nextToolId, visual);
      }
      this.character.setRightHandTool(visual);
      this.character.setRightHandToolVisible(true);
      if (this.equippedToolId !== nextToolId) {
        this.tools.get(nextToolId)?.fireEquipped();
      }
      this.equippedToolId = nextToolId;
      return;
    }

    this.equippedToolId = null;

    if (nextId === "sword") {
      this.character.setRightHandTool(this.sword);
      this.character.setRightHandToolVisible(true);
      return;
    }

    this.character.setRightHandTool(this.sword);
    this.character.setRightHandToolVisible(false);
  }

  dispose() {
    this.disposed = true;
    this.unsub?.();
    this.character.setRightHandTool(null);
    this.visuals.clear();
    this.tools.clear();
  }
}

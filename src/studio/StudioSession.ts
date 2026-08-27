import type { Instance } from "../instances/Instance";

export type StudioTool = "select" | "move" | "scale" | "rotate";

type Listener = () => void;

/**
 * Shared studio state: selection, active tool, and hierarchy dirty ticks.
 */
export class StudioSession {
  selected: Instance | null = null;
  tool: StudioTool = "select";
  private readonly listeners = new Set<Listener>();
  private readonly hierarchyListeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onHierarchy(fn: Listener) {
    this.hierarchyListeners.add(fn);
    return () => this.hierarchyListeners.delete(fn);
  }

  select(instance: Instance | null) {
    if (this.selected === instance) return;
    this.selected = instance;
    this.emit();
  }

  setTool(tool: StudioTool) {
    if (this.tool === tool) return;
    this.tool = tool;
    this.emit();
  }

  notifyHierarchy() {
    for (const fn of this.hierarchyListeners) fn();
    this.emit();
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}

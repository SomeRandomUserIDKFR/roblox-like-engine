export interface UndoCommand {
  readonly label: string;
  undo(): void;
  redo(): void;
}

type Listener = () => void;

/** Linear undo / redo stack for HedronX studio. */
export class UndoStack {
  private readonly undoStack: UndoCommand[] = [];
  private readonly redoStack: UndoCommand[] = [];
  private readonly listeners = new Set<Listener>();
  private locked = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get undoLabel() {
    return this.undoStack.at(-1)?.label ?? null;
  }

  get redoLabel() {
    return this.redoStack.at(-1)?.label ?? null;
  }

  /** Run command and push onto undo stack (clears redo). */
  push(cmd: UndoCommand) {
    if (this.locked) return;
    cmd.redo();
    this.undoStack.push(cmd);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit();
  }

  /** Push a command that was already applied (e.g. live transform). */
  pushApplied(cmd: UndoCommand) {
    if (this.locked) return;
    this.undoStack.push(cmd);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit();
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    this.locked = true;
    try {
      cmd.undo();
    } finally {
      this.locked = false;
    }
    this.redoStack.push(cmd);
    this.emit();
    return cmd;
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    this.locked = true;
    try {
      cmd.redo();
    } finally {
      this.locked = false;
    }
    this.undoStack.push(cmd);
    this.emit();
    return cmd;
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}

/**
 * Base for studio-style hierarchy (Part, Model, …).
 */
import { Signal } from "../core/Signal";

export class Instance {
  name: string;
  parent: Instance | null = null;
  readonly children: Instance[] = [];

  readonly ChildAdded = new Signal<[child: Instance]>();
  readonly ChildRemoved = new Signal<[child: Instance]>();
  readonly AncestryChanged = new Signal<[]>();
  readonly Destroying = new Signal<[]>();

  constructor(name = "Instance") {
    this.name = name;
  }

  setParent(parent: Instance | null) {
    const prev = this.parent;
    if (prev) {
      const i = prev.children.indexOf(this);
      if (i >= 0) prev.children.splice(i, 1);
      prev.ChildRemoved.Fire(this);
    }
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
      parent.ChildAdded.Fire(this);
    }
    this.AncestryChanged.Fire();
  }

  findFirstChild(name: string): Instance | undefined {
    return this.children.find((c) => c.name === name);
  }

  FindFirstChild(name: string): Instance | undefined {
    return this.findFirstChild(name);
  }

  WaitForChild(name: string, timeout = 5): Promise<Instance> {
    const existing = this.findFirstChild(name);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const conn = this.ChildAdded.Connect((child) => {
        if (child.name === name) {
          conn.Disconnect();
          clearTimeout(timer);
          resolve(child);
        }
      });
      const timer = setTimeout(() => {
        conn.Disconnect();
        reject(new Error(`WaitForChild timed out: ${name}`));
      }, timeout * 1000);
    });
  }

  GetChildren(): Instance[] {
    return [...this.children];
  }

  getDescendants(): Instance[] {
    const out: Instance[] = [];
    const walk = (node: Instance) => {
      for (const child of node.children) {
        out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  GetDescendants(): Instance[] {
    return this.getDescendants();
  }

  Destroy() {
    this.Destroying.Fire();
    for (const child of [...this.children]) {
      child.Destroy();
    }
    this.setParent(null);
  }

  IsA(className: string): boolean {
    return this.constructor.name === className;
  }
}

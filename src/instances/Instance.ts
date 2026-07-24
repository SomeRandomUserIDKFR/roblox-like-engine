/**
 * Base for studio-style hierarchy (Part, Model, …).
 */
export class Instance {
  name: string;
  parent: Instance | null = null;
  readonly children: Instance[] = [];

  constructor(name = "Instance") {
    this.name = name;
  }

  setParent(parent: Instance | null) {
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = parent;
    if (parent) parent.children.push(this);
  }

  findFirstChild(name: string): Instance | undefined {
    return this.children.find((c) => c.name === name);
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
}

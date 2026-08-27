import { Signal } from "../core/Signal";
import type { Part } from "../instances/Part";
import type { Workspace } from "../instances/Workspace";
import { aabbOverlaps, type AABB } from "./AABB";
import type { CharacterCollider } from "./CollisionWorld";
import { Vector3 } from "three";

/** Per-part Touched / TouchEnded (player body vs canTouch parts). */
export class TouchRuntime {
  private readonly overlapping = new Set<Part>();
  private readonly partTouched = new WeakMap<Part, Signal<[other: Part | "Player"]>>();
  private readonly partTouchEnded = new WeakMap<
    Part,
    Signal<[other: Part | "Player"]>
  >();

  constructor(private readonly workspace: Workspace) {}

  Touched(part: Part): Signal<[other: Part | "Player"]> {
    let s = this.partTouched.get(part);
    if (!s) {
      s = new Signal();
      this.partTouched.set(part, s);
    }
    return s;
  }

  TouchEnded(part: Part): Signal<[other: Part | "Player"]> {
    let s = this.partTouchEnded.get(part);
    if (!s) {
      s = new Signal();
      this.partTouchEnded.set(part, s);
    }
    return s;
  }

  /** Attach Touched helpers onto Part for scripts. */
  bindPartApi(part: Part) {
    const self = this;
    if (!(part as Part & { Touched?: unknown }).Touched) {
      Object.defineProperty(part, "Touched", {
        get() {
          return self.Touched(part);
        },
        configurable: true,
      });
      Object.defineProperty(part, "TouchEnded", {
        get() {
          return self.TouchEnded(part);
        },
        configurable: true,
      });
    }
  }

  bindAll() {
    for (const p of this.workspace.parts) this.bindPartApi(p);
  }

  update(
    root: Vector3,
    collider: CharacterCollider,
    bodyAt: (root: Vector3, c: CharacterCollider) => AABB,
  ) {
    const body = bodyAt(root, collider);
    const now = new Set<Part>();

    for (const part of this.workspace.parts) {
      if (!part.canTouch || part.destroyed || part.isRamp) continue;
      if (aabbOverlaps(body, part.getAABB(), 0.02)) {
        now.add(part);
        if (!this.overlapping.has(part)) {
          this.Touched(part).Fire("Player");
        }
      }
    }

    for (const part of this.overlapping) {
      if (!now.has(part)) {
        this.TouchEnded(part).Fire("Player");
      }
    }

    this.overlapping.clear();
    for (const p of now) this.overlapping.add(p);
  }
}

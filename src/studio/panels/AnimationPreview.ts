import { Animation, type RigKeyframe } from "../../instances/Animation";
import { Part } from "../../instances/Part";
import type { Workspace } from "../../instances/Workspace";
import type { StudioSession } from "../StudioSession";
import {
  EditableTestRig,
  isTestRigInstance,
} from "../anim/EditableTestRig";

export type AnimPreviewHandle = {
  /** Active physical test rig, if any. */
  getRig: () => EditableTestRig | null;
  getPlayhead: () => number;
  /** Capture current rig pose into a new keyframe at playhead. */
  addKeyframeFromPose: () => boolean;
  dispose: () => void;
};

/**
 * Timeline controls for the selected Animation.
 * Spawns a physical selectable/movable R6 test rig in the main viewport.
 */
export function mountAnimationPreview(
  host: HTMLElement,
  session: StudioSession,
  workspace: Workspace,
  opts: {
    getSpawnOrigin: () => { x: number; y: number; z: number };
    onEdited: () => void;
    onHierarchy: () => void;
  },
): AnimPreviewHandle {
  host.className = "hx-anim-preview";
  host.hidden = true;
  host.innerHTML = "";

  const header = document.createElement("div");
  header.className = "hx-anim-preview__header";
  header.textContent = "Test Rig · pose limbs, then Add Keyframe";

  const hint = document.createElement("div");
  hint.className = "hx-anim-preview__hint";
  hint.textContent =
    "Select a colored limb → Move (2) / Rotate (4). Add Keyframe stores the current pose.";

  const controls = document.createElement("div");
  controls.className = "hx-anim-preview__controls";

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.textContent = "Play";
  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.textContent = "Stop";
  const addKfBtn = document.createElement("button");
  addKfBtn.type = "button";
  addKfBtn.className = "hx-anim-preview__add";
  addKfBtn.textContent = "+ Keyframe";
  addKfBtn.title = "Capture current limb pose at playhead";

  const scrub = document.createElement("input");
  scrub.type = "range";
  scrub.min = "0";
  scrub.max = "1000";
  scrub.value = "0";
  const timeLabel = document.createElement("span");
  timeLabel.className = "hx-anim-preview__time";
  timeLabel.textContent = "0.00s";

  controls.append(playBtn, stopBtn, addKfBtn, scrub, timeLabel);
  host.append(header, hint, controls);

  let rig: EditableTestRig | null = null;
  let anim: Animation | null = null;
  let playing = false;
  let time = 0;
  let raf = 0;
  let last = performance.now();
  let disposed = false;

  function playhead(): number {
    return time;
  }

  function applySampled() {
    if (!rig || !anim) return;
    rig.applyPose(anim.sample(time));
  }

  function ensureRig(next: Animation) {
    if (rig && rig.animation === next) {
      anim = next;
      scrub.max = String(Math.max(1, Math.round(next.length * 1000)));
      return;
    }
    disposeRig();
    anim = next;
    const origin = opts.getSpawnOrigin();
    rig = new EditableTestRig(workspace, next, {
      x: origin.x + 6,
      y: Math.max(0, origin.y),
      z: origin.z,
    });
    scrub.max = String(Math.max(1, Math.round(next.length * 1000)));
    time = 0;
    applySampled();
    opts.onHierarchy();
  }

  function disposeRig() {
    if (!rig) return;
    const wasSelected = rig.owns(session.selected);
    rig.dispose(workspace);
    rig = null;
    if (wasSelected) session.select(anim);
    opts.onHierarchy();
  }

  function addKeyframeFromPose(): boolean {
    if (!rig || !anim) return false;
    const kf = rig.capturePose(playhead());
    // Replace key at same time (within epsilon) or insert
    const eps = 0.02;
    const existing = anim.keyframes.findIndex(
      (k) => Math.abs(k.time - kf.time) < eps,
    );
    if (existing >= 0) {
      anim.keyframes[existing] = kf;
    } else {
      anim.keyframes.push(kf);
    }
    anim.keyframes.sort((a, b) => a.time - b.time);
    anim.length = Math.max(
      anim.length,
      ...anim.keyframes.map((k) => k.time),
      0.05,
    );
    scrub.max = String(Math.max(1, Math.round(anim.length * 1000)));
    opts.onEdited();
    return true;
  }

  playBtn.addEventListener("click", () => {
    if (!anim) return;
    playing = true;
  });
  stopBtn.addEventListener("click", () => {
    playing = false;
  });
  addKfBtn.addEventListener("click", () => {
    if (addKeyframeFromPose()) {
      addKfBtn.textContent = "Captured ✓";
      setTimeout(() => {
        addKfBtn.textContent = "+ Keyframe";
      }, 700);
    }
  });
  scrub.addEventListener("input", () => {
    playing = false;
    time = Number(scrub.value) / 1000;
    timeLabel.textContent = `${time.toFixed(2)}s`;
    applySampled();
  });

  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing && anim && rig) {
      time += dt;
      const len = Math.max(0.05, anim.length);
      if (anim.looped) time = ((time % len) + len) % len;
      else if (time >= len) {
        time = len;
        playing = false;
      }
      scrub.value = String(Math.round(time * 1000));
      timeLabel.textContent = `${time.toFixed(2)}s`;
      applySampled();
    }
    raf = requestAnimationFrame(frame);
  }

  function resolveAnimation(): Animation | null {
    const sel = session.selected;
    if (sel instanceof Animation) return sel;
    if (sel instanceof Part && sel.isTestRig && rig?.owns(sel)) {
      return rig.animation;
    }
    return null;
  }

  function syncSelection() {
    const next = resolveAnimation();
    const show = next !== null || (rig !== null && isTestRigInstance(session.selected));
    host.hidden = !show && !next;

    if (next) {
      host.hidden = false;
      ensureRig(next);
    } else if (!isTestRigInstance(session.selected)) {
      // Left animation context
      disposeRig();
      anim = null;
      host.hidden = true;
      playing = false;
    }
  }

  syncSelection();
  session.subscribe(syncSelection);
  raf = requestAnimationFrame(frame);

  return {
    getRig: () => rig,
    getPlayhead: () => time,
    addKeyframeFromPose,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      disposeRig();
    },
  };
}

export function keyframeEditorRows(
  anim: Animation,
  onChange: () => void,
  captureFromRig?: () => RigKeyframe | null,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "hx-kf-editor";
  const list = document.createElement("div");
  list.className = "hx-kf-list";

  const rebuild = () => {
    list.innerHTML = "";
    const keys = [...anim.keyframes].sort((a, b) => a.time - b.time);
    keys.forEach((kf, idx) => {
      const row = document.createElement("div");
      row.className = "hx-kf-row";
      const label = document.createElement("span");
      label.textContent = `#${idx} t=`;
      const time = document.createElement("input");
      time.type = "number";
      time.step = "0.05";
      time.value = String(kf.time);
      time.addEventListener("change", () => {
        kf.time = Math.max(0, Number(time.value) || 0);
        anim.length = Math.max(
          anim.length,
          ...anim.keyframes.map((k) => k.time),
        );
        onChange();
      });
      const ra = document.createElement("input");
      ra.type = "number";
      ra.step = "0.05";
      ra.title = "RightArm X";
      ra.value = String(Number(kf.rightArm.x.toFixed(3)));
      ra.addEventListener("change", () => {
        kf.rightArm.x = Number(ra.value) || 0;
        onChange();
      });
      const raz = document.createElement("input");
      raz.type = "number";
      raz.step = "0.05";
      raz.title = "RightArm Z";
      raz.value = String(Number(kf.rightArm.z.toFixed(3)));
      raz.addEventListener("change", () => {
        kf.rightArm.z = Number(raz.value) || 0;
        onChange();
      });
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "✕";
      del.addEventListener("click", () => {
        anim.keyframes = anim.keyframes.filter((k) => k !== kf);
        rebuild();
        onChange();
      });
      row.append(label, time, ra, raz, del);
      list.appendChild(row);
    });
  };

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "hx-explorer__btn";
  addBtn.textContent = "+ Keyframe from pose";
  addBtn.title = "Capture the physical test rig’s current limb transforms";
  addBtn.addEventListener("click", () => {
    const captured = captureFromRig?.() ?? null;
    const t =
      captured?.time ??
      anim.keyframes.reduce((m, k) => Math.max(m, k.time), 0) + 0.25;
    const kf: RigKeyframe = captured ?? {
      time: t,
      leftArm: { x: 0, z: 0 },
      rightArm: { x: 0, z: 0 },
      leftLeg: { x: 0, z: 0 },
      rightLeg: { x: 0, z: 0 },
      torsoRx: 0,
      torsoRy: 0,
      torsoRz: 0,
      bob: 0,
      shiftX: 0,
    };
    if (!captured) kf.time = t;

    const eps = 0.02;
    const existing = anim.keyframes.findIndex(
      (k) => Math.abs(k.time - kf.time) < eps,
    );
    if (existing >= 0) anim.keyframes[existing] = kf;
    else anim.keyframes.push(kf);
    anim.keyframes.sort((a, b) => a.time - b.time);
    anim.length = Math.max(
      anim.length,
      ...anim.keyframes.map((k) => k.time),
      0.05,
    );
    rebuild();
    onChange();
  });

  rebuild();
  wrap.append(addBtn, list);
  return wrap;
}

import {
  ACESFilmicToneMapping,
  BoxHelper,
  Color,
  GridHelper,
  MOUSE,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { WebGPURenderer } from "three/webgpu";
import { Part } from "../../instances/Part";
import type { Workspace } from "../../instances/Workspace";
import { setupLighting } from "../../world/lighting";
import type { StudioSession } from "../StudioSession";
import { createTransformDrag } from "./TransformDrag";
import { TransformHandles } from "./TransformHandles";

export interface StudioViewport {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGPURenderer;
  controls: OrbitControls;
  dispose: () => void;
  focusSelection: () => void;
}

/** Studio 3D view: orbit camera, click-to-select, classic transform dots. */
export async function mountStudioViewport(
  host: HTMLElement,
  workspace: Workspace,
  session: StudioSession,
  opts?: {
    onTransform?: () => void;
    onTransformCommit?: (commit: {
      part: Part;
      before: import("../undo/commands").PartPose;
      after: import("../undo/commands").PartPose;
      label: string;
    }) => void;
  },
): Promise<StudioViewport> {
  host.innerHTML = "";
  host.className = "hx-viewport-wrap";

  const scene = new Scene();
  scene.background = new Color(0x1a222e);

  workspace.mount(scene);
  setupLighting(scene);

  const grid = new GridHelper(200, 40, 0x4a5a6e, 0x2a3544);
  grid.position.y = 0.01;
  scene.add(grid);

  const handles = new TransformHandles();
  scene.add(handles.root);

  const camera = new PerspectiveCamera(55, 1, 0.1, 500);
  camera.position.set(28, 22, 36);

  const renderer = new WebGPURenderer({ antialias: true });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth || 800, host.clientHeight || 600, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = SRGBColorSpace;
  host.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 2, 0);
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.mouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };
  controls.update();

  /**
   * OrbitControls can get stuck in PAN/ROTATE if pointerup is missed (RMB
   * context-menu, blur, or disabling controls mid-drag). Force idle.
   */
  function clearOrbitPointerState() {
    const c = controls as OrbitControls & {
      state: number;
      _pointers: number[];
      _onPointerMove: (e: PointerEvent) => void;
      _onPointerUp: (e: PointerEvent) => void;
    };
    const canvas = renderer.domElement;
    for (const id of [...(c._pointers ?? [])]) {
      try {
        canvas.releasePointerCapture(id);
      } catch {
        /* not capturing */
      }
    }
    c._pointers.length = 0;
    c.state = -1; // _STATE.NONE
    canvas.removeEventListener("pointermove", c._onPointerMove);
    canvas.removeEventListener("pointerup", c._onPointerUp);
  }

  // RMB often opens a context menu and skips a clean pointerup
  renderer.domElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  const onWinPointerUp = (e: PointerEvent) => {
    // All buttons released — ensure orbit isn't still in PAN/ROTATE
    if (e.buttons !== 0 || handleDragging) return;
    clearOrbitPointerState();
  };
  const onWinBlur = () => {
    clearOrbitPointerState();
  };
  window.addEventListener("pointerup", onWinPointerUp);
  window.addEventListener("pointercancel", onWinPointerUp);
  window.addEventListener("blur", onWinBlur);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearOrbitPointerState();
  });

  const hint = document.createElement("div");
  hint.className = "hx-viewport-hint";
  host.appendChild(hint);

  let boxHelper: BoxHelper | null = null;
  let handleDragging = false;

  function clearBox() {
    if (!boxHelper) return;
    scene.remove(boxHelper);
    boxHelper.dispose();
    boxHelper = null;
  }

  function syncHandlesAndBox() {
    clearBox();
    const sel = session.selected;
    const part = sel instanceof Part ? sel : null;
    handles.setTarget(part && !part.locked ? part : null, session.tool);
    if (part && session.tool === "select") {
      boxHelper = new BoxHelper(part.mesh, part.locked ? 0xffaa44 : 0x00a2ff);
      scene.add(boxHelper);
    }
    syncOrbitMode();
    syncHint();
  }

  function syncOrbitMode() {
    // Transform tools: LMB reserved for handles / select; orbit with MMB / RMB
    if (session.tool === "select") {
      controls.mouseButtons.LEFT = MOUSE.ROTATE;
    } else {
      controls.mouseButtons.LEFT = -1 as unknown as typeof MOUSE.ROTATE;
    }
  }

  function syncHint() {
    const t = session.tool;
    if (t === "move") {
      hint.textContent =
        "Move: drag R/G/B dots · snap 1 stud · Shift = 0.1 · MMB orbit · RMB pan";
    } else if (t === "scale") {
      hint.textContent =
        "Scale: drag face dots · snap 1 · Shift = 0.1 · MMB orbit · RMB pan";
    } else if (t === "rotate") {
      hint.textContent =
        "Rotate: drag ring / dots · snap 15° · Shift = 1° · MMB orbit · RMB pan";
    } else {
      hint.textContent =
        "Select: click · Drag LMB orbit · Scroll zoom · RMB pan · F focus";
    }
  }

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(host);
  resize();

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let draggingView = false;
  let downX = 0;
  let downY = 0;

  const drag = createTransformDrag(handles, () => {
    handles.sync();
    boxHelper?.update();
    opts?.onTransform?.();
  });

  function setPointerFromEvent(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickHandle(e: PointerEvent) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(handles.getPickables(), true);
    if (hits.length === 0) return null;
    return handles.hitFromObject(hits[0].object);
  }

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    draggingView = false;
    downX = e.clientX;
    downY = e.clientY;

    const part = session.selected instanceof Part ? session.selected : null;
    if (
      part &&
      !part.locked &&
      (session.tool === "move" ||
        session.tool === "scale" ||
        session.tool === "rotate")
    ) {
      const h = pickHandle(e);
      if (h) {
        clearOrbitPointerState();
        handleDragging = true;
        controls.enabled = false;
        drag.begin(h, part, e, renderer.domElement, camera);
        renderer.domElement.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  renderer.domElement.addEventListener("pointermove", (e) => {
    if (handleDragging) {
      drag.move(e, renderer.domElement, camera, e.shiftKey);
      return;
    }
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) {
      draggingView = true;
    }
  });

  function endHandleDrag(e: PointerEvent) {
    if (!handleDragging) return;
    handleDragging = false;
    const commit = drag.end();
    controls.enabled = true;
    clearOrbitPointerState();
    try {
      renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (commit) opts?.onTransformCommit?.(commit);
    opts?.onTransform?.();
    session.notifyHierarchy();
  }

  renderer.domElement.addEventListener("pointerup", (e) => {
    if (e.button !== 0) return;
    if (handleDragging) {
      endHandleDrag(e);
      return;
    }
    if (draggingView) return;

    // Prefer selecting a part under cursor (handles already handled)
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    const pickable = workspace.parts
      .filter((p) => p.canQuery)
      .map((p) => p.mesh);
    const hits = raycaster.intersectObjects(pickable, false);
    if (hits.length === 0) {
      session.select(workspace);
      return;
    }
    const mesh = hits[0].object;
    const part = workspace.parts.find((p) => p.mesh === mesh) ?? null;
    session.select(part);
  });

  renderer.domElement.addEventListener("pointercancel", (e) => {
    endHandleDrag(e);
  });

  let raf = 0;
  let alive = true;
  function frame() {
    if (!alive) return;
    controls.update();
    handles.sync();
    boxHelper?.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const unsub = session.subscribe(syncHandlesAndBox);
  syncHandlesAndBox();

  function focusSelection() {
    const sel = session.selected;
    if (!(sel instanceof Part)) return;
    controls.target.copy(sel.position);
    const dist = Math.max(sel.size.length() * 1.8, 8);
    const dir = new Vector3(1, 0.7, 1).normalize();
    camera.position.copy(sel.position).addScaledVector(dir, dist);
    controls.update();
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    focusSelection,
    dispose: () => {
      alive = false;
      cancelAnimationFrame(raf);
      unsub();
      clearBox();
      clearOrbitPointerState();
      window.removeEventListener("pointerup", onWinPointerUp);
      window.removeEventListener("pointercancel", onWinPointerUp);
      window.removeEventListener("blur", onWinBlur);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.remove();
    },
  };
}

import { navigate } from "../app/router";
import {
  createDefaultScreenGui,
  createDefaultViewportFrame,
} from "../gui/GuiRuntime";
import {
  Animation,
  createCheerAnimation,
  createWaveAnimation,
} from "../instances/Animation";
import {
  Frame,
  ScreenGui,
  TextButton,
  TextLabel,
  ViewportFrame,
} from "../instances/Gui";
import type { Instance } from "../instances/Instance";
import { Model } from "../instances/Model";
import { makePart, Part } from "../instances/Part";
import { BindableEvent, RemoteEvent } from "../instances/RemoteEvent";
import { ModuleScript, Script } from "../instances/Script";
import { createDefaultTool, Tool } from "../instances/Tool";
import { queuePlaceForPlay } from "../place/activePlace";
import {
  loadSnapshotIntoWorkspace,
  snapshotWorkspace,
} from "../place/PlaceSnapshot";
import {
  autosavePlace,
  downloadPlace,
  openPlaceFile,
} from "../place/placeFile";
import { createStudioPlace } from "./createStudioPlace";
import { mountAnimationPreview } from "./panels/AnimationPreview";
import { mountExplorer } from "./panels/ExplorerPanel";
import { mountProperties } from "./panels/PropertiesPanel";
import { mountMenubar, mountRibbon } from "./panels/Ribbon";
import {
  nextAnimationName,
  nextModelName,
  nextModuleScriptName,
  nextPartName,
  nextRemoteEventName,
  nextScreenGuiName,
  nextScriptName,
  nextToolName,
  nextViewportFrameName,
  resolveInsertParent,
} from "./studioOps";
import { StudioSession } from "./StudioSession";
import {
  deleteInstanceCommand,
  deleteModelCommand,
  deletePartCommand,
  deleteToolCommand,
  insertInstanceCommand,
  insertModelCommand,
  insertPartCommand,
  insertToolCommand,
  posesEqual,
  transformCommand,
} from "./undo/commands";
import { UndoStack } from "./undo/UndoStack";
import {
  mountStudioViewport,
  type StudioViewport,
} from "./viewport/StudioViewport";
import "./studio.css";

/**
 * Boot HedronX studio (Roblox Studio–style layout) into `root`.
 */
export async function mountStudioApp(root: HTMLElement) {
  root.innerHTML = "";
  root.className = "hx-studio";
  root.removeAttribute("hidden");

  const menubar = document.createElement("div");
  const ribbon = document.createElement("div");
  const explorer = document.createElement("div");
  const viewportHost = document.createElement("div");
  const properties = document.createElement("div");
  const status = document.createElement("div");
  status.className = "hx-status";

  root.append(menubar, ribbon, explorer, viewportHost, properties, status);

  const session = new StudioSession();
  const undo = new UndoStack();
  const workspace = createStudioPlace();

  const setStatus = (msg: string) => {
    status.textContent = msg;
  };
  setStatus("Ready · File → Save/Open · Play to test");

  const refreshAfterUndo = () => {
    session.notifyHierarchy();
  };

  function playMap() {
    try {
      const snap = snapshotWorkspace(workspace);
      autosavePlace(snap);
      queuePlaceForPlay(snap);
      setStatus(`Playing map (${workspace.parts.length} parts)…`);
      navigate("polyx");
    } catch (err) {
      console.error(err);
      setStatus(`Play failed: ${err}`);
    }
  }

  function savePlace() {
    try {
      const snap = snapshotWorkspace(workspace);
      autosavePlace(snap);
      downloadPlace(snap, "place");
      setStatus(`Saved place.polyx.json (${workspace.parts.length} parts)`);
    } catch (err) {
      console.error(err);
      setStatus(`Save failed: ${err}`);
    }
  }

  async function openPlace() {
    const snap = await openPlaceFile();
    if (!snap) {
      setStatus("Open cancelled");
      return;
    }
    try {
      loadSnapshotIntoWorkspace(workspace, snap);
      session.select(workspace);
      refreshAfterUndo();
      setStatus(`Opened place (${workspace.parts.length} parts)`);
    } catch (err) {
      console.error(err);
      setStatus(`Open failed: ${err}`);
    }
  }

  mountMenubar(menubar, { playMap, savePlace, openPlace });

  undo.subscribe(() => {
    /* ribbon buttons sync via their own subscribe */
  });

  const viewport: StudioViewport = await mountStudioViewport(
    viewportHost,
    workspace,
    session,
    {
      onTransformCommit: (commit) => {
        if (posesEqual(commit.before, commit.after)) return;
        undo.pushApplied(
          transformCommand(commit.part, commit.before, commit.after, commit.label),
        );
        setStatus(`${commit.label} · Ctrl+Z undo`);
      },
    },
  );

  function insertPart(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextPartName(workspace);
    const target =
      session.selected instanceof Part
        ? session.selected.position.clone()
        : viewport.controls.target.clone();
    const part = makePart(
      name,
      target.x,
      Math.max(0.5, target.y + 2),
      target.z,
      4,
      1,
      2,
      0x9e9e9e,
    );
    undo.push(insertPartCommand(workspace, part, parent));
    session.select(part);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertModel(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextModelName(workspace);
    const model = new Model(name);
    undo.push(insertModelCommand(workspace, model, parent));
    session.select(model);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertScript(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextScriptName(workspace);
    const script = new Script(name);
    undo.push(insertInstanceCommand(script, parent));
    session.select(script);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertModuleScript(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextModuleScriptName(workspace);
    const mod = new ModuleScript(name);
    undo.push(insertInstanceCommand(mod, parent));
    session.select(mod);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertTool(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextToolName(workspace);
    const tool = createDefaultTool(name);
    const target =
      session.selected instanceof Part
        ? session.selected.position.clone()
        : viewport.controls.target.clone();
    const handle = tool.getHandle();
    if (handle) {
      const dx = target.x - handle.position.x;
      const dy = Math.max(1, target.y + 2) - handle.position.y;
      const dz = target.z - handle.position.z;
      for (const p of tool.getParts()) {
        p.position.x += dx;
        p.position.y += dy;
        p.position.z += dz;
        p.sync();
      }
    }
    undo.push(insertToolCommand(workspace, tool, parent));
    session.select(tool);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertScreenGui(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextScreenGuiName(workspace);
    const gui = createDefaultScreenGui(name);
    undo.push(insertInstanceCommand(gui, parent));
    session.select(gui);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertViewportFrame(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    // Prefer nesting under a ScreenGui
    let guiParent = parent;
    if (!(parent instanceof ScreenGui) && !(parent instanceof Frame)) {
      const existing = workspace
        .getDescendants()
        .find((d): d is ScreenGui => d instanceof ScreenGui);
      guiParent = existing ?? parent;
    }
    const name = nextViewportFrameName(workspace);
    const vf = createDefaultViewportFrame(name);
    undo.push(insertInstanceCommand(vf, guiParent));
    session.select(vf);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertAnimation(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextAnimationName(workspace);
    const anim =
      name.toLowerCase().includes("cheer")
        ? createCheerAnimation(name)
        : createWaveAnimation(name);
    undo.push(insertInstanceCommand(anim, parent));
    session.select(anim);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function insertRemoteEvent(parentArg?: Instance) {
    const parent = parentArg ?? resolveInsertParent(workspace, session.selected);
    const name = nextRemoteEventName(workspace);
    const remote = new RemoteEvent(name);
    undo.push(insertInstanceCommand(remote, parent));
    session.select(remote);
    refreshAfterUndo();
    setStatus(`Inserted ${name}`);
  }

  function deleteSelected() {
    const sel = session.selected;
    if (sel instanceof Part) {
      if (sel.name === "Baseplate") {
        setStatus("Cannot delete Baseplate");
        return;
      }
      if (sel.isTestRig) {
        setStatus("Deselect Animation to remove the Test Rig");
        return;
      }
      if (sel.locked) {
        setStatus("Part is Locked");
        return;
      }
      const name = sel.name;
      const parent = sel.parent ?? workspace;
      undo.push(deletePartCommand(workspace, sel));
      session.select(parent);
      refreshAfterUndo();
      setStatus(`Deleted ${name}`);
      return;
    }
    if (sel instanceof Model) {
      if (sel.name === "AnimationTestRig") {
        setStatus("Deselect Animation to remove the Test Rig");
        return;
      }
      const name = sel.name;
      const parent = sel.parent ?? workspace;
      undo.push(deleteModelCommand(workspace, sel));
      session.select(parent);
      refreshAfterUndo();
      setStatus(`Deleted ${name}`);
      return;
    }
    if (sel instanceof Tool) {
      const name = sel.name;
      const parent = sel.parent ?? workspace;
      undo.push(deleteToolCommand(workspace, sel));
      session.select(parent);
      refreshAfterUndo();
      setStatus(`Deleted ${name}`);
      return;
    }
    if (
      sel instanceof Script ||
      sel instanceof ModuleScript ||
      sel instanceof ScreenGui ||
      sel instanceof Frame ||
      sel instanceof TextLabel ||
      sel instanceof TextButton ||
      sel instanceof ViewportFrame ||
      sel instanceof Animation ||
      sel instanceof RemoteEvent ||
      sel instanceof BindableEvent
    ) {
      const name = sel.name;
      const parent = sel.parent ?? workspace;
      undo.push(deleteInstanceCommand(sel));
      session.select(parent);
      refreshAfterUndo();
      setStatus(`Deleted ${name}`);
      return;
    }
    setStatus("Select an object to delete");
  }

  function doUndo() {
    const cmd = undo.undo();
    if (!cmd) {
      setStatus("Nothing to undo");
      return;
    }
    refreshAfterUndo();
    setStatus(`Undo: ${cmd.label}`);
  }

  function doRedo() {
    const cmd = undo.redo();
    if (!cmd) {
      setStatus("Nothing to redo");
      return;
    }
    refreshAfterUndo();
    setStatus(`Redo: ${cmd.label}`);
  }

  const explorerCtl = mountExplorer(explorer, workspace, session, {
    insertPart,
    insertModel,
    insertScript,
    insertModuleScript,
    insertTool,
    insertScreenGui,
    insertViewportFrame,
    insertAnimation,
    insertRemoteEvent,
    deleteSelected,
  });

  const animCtl: {
    current: ReturnType<typeof mountAnimationPreview> | null;
  } = { current: null };

  mountProperties(
    properties,
    session,
    undo,
    () => {
      setStatus(session.selected ? `Edited ${session.selected.name}` : "Ready");
      refreshAfterUndo();
    },
    {
      captureAnimPose: () => {
        const h = animCtl.current;
        const rig = h?.getRig();
        if (!rig || !h) return null;
        return rig.capturePose(h.getPlayhead());
      },
    },
  );

  const animPreviewHost = document.createElement("div");
  viewportHost.style.position = "relative";
  viewportHost.appendChild(animPreviewHost);
  const animPreview = mountAnimationPreview(
    animPreviewHost,
    session,
    workspace,
    {
      getSpawnOrigin: () => ({
        x: viewport.controls.target.x,
        y: Math.max(0, viewport.controls.target.y),
        z: viewport.controls.target.z,
      }),
      onEdited: () => {
        refreshAfterUndo();
        setStatus("Keyframe captured from Test Rig pose");
      },
      onHierarchy: () => refreshAfterUndo(),
    },
  );
  animCtl.current = animPreview;

  mountRibbon(ribbon, session, undo, {
    insertPart: () => insertPart(),
    insertModel: () => insertModel(),
    insertScript: () => insertScript(),
    insertModuleScript: () => insertModuleScript(),
    insertTool: () => insertTool(),
    insertScreenGui: () => insertScreenGui(),
    insertViewportFrame: () => insertViewportFrame(),
    insertAnimation: () => insertAnimation(),
    insertRemoteEvent: () => insertRemoteEvent(),
    deleteSelected,
    undo: doUndo,
    redo: doRedo,
    playMap,
  });

  const autosaveTimer = window.setInterval(() => {
    try {
      autosavePlace(snapshotWorkspace(workspace));
    } catch {
      /* ignore */
    }
  }, 30_000);

  const onKey = (e: KeyboardEvent) => {
    if (!document.body.classList.contains("route-hedronx")) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      savePlace();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
      e.preventDefault();
      void openPlace();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      doUndo();
      return;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      doRedo();
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
    }
    if (e.key === "f" || e.key === "F") {
      viewport.focusSelection();
    }
    if (e.key === "1") session.setTool("select");
    if (e.key === "2") session.setTool("move");
    if (e.key === "3") session.setTool("scale");
    if (e.key === "4") session.setTool("rotate");
  };
  window.addEventListener("keydown", onKey);

  session.select(workspace);
  setStatus(
    `${workspace.parts.length} parts · Ctrl+S save · Ctrl+Z undo · Play to test`,
  );

  return {
    workspace,
    session,
    undo,
    viewport,
    dispose: () => {
      window.clearInterval(autosaveTimer);
      window.removeEventListener("keydown", onKey);
      explorerCtl.dispose();
      animPreview.dispose();
      viewport.dispose();
    },
  };
}

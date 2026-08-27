import { navigate } from "../../app/router";
import { STUDIO_NAME } from "../../brand";
import type { StudioSession, StudioTool } from "../StudioSession";
import type { UndoStack } from "../undo/UndoStack";

export function mountMenubar(
  host: HTMLElement,
  actions?: {
    playMap?: () => void;
    savePlace?: () => void;
    openPlace?: () => void;
  },
) {
  host.className = "hx-menubar";
  host.innerHTML = "";

  const brand = document.createElement("span");
  brand.className = "hx-brand";
  brand.textContent = STUDIO_NAME;
  brand.title = `${STUDIO_NAME} studio`;

  const fileWrap = document.createElement("div");
  fileWrap.className = "hx-menu-drop";
  const file = document.createElement("button");
  file.type = "button";
  file.className = "hx-menu-btn";
  file.textContent = "File";
  const fileMenu = document.createElement("div");
  fileMenu.className = "hx-menu-drop__panel";
  fileMenu.hidden = true;

  const addFileItem = (label: string, fn: () => void) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "hx-menu-drop__item";
    item.textContent = label;
    item.addEventListener("click", () => {
      fileMenu.hidden = true;
      fn();
    });
    fileMenu.appendChild(item);
  };
  addFileItem("Open Place…", () => actions?.openPlace?.());
  addFileItem("Save Place…", () => actions?.savePlace?.());
  file.addEventListener("click", (e) => {
    e.stopPropagation();
    fileMenu.hidden = !fileMenu.hidden;
  });
  document.addEventListener("click", () => {
    fileMenu.hidden = true;
  });
  fileWrap.append(file, fileMenu);

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "hx-menu-btn";
  edit.textContent = "Edit";
  edit.title = "Ctrl+Z / Ctrl+Y";

  const view = document.createElement("button");
  view.type = "button";
  view.className = "hx-menu-btn";
  view.textContent = "View";
  view.title = "Coming soon";

  const play = document.createElement("button");
  play.type = "button";
  play.className = "hx-menu-btn hx-menu-btn--link";
  play.textContent = "Play";
  play.title = "Play this map in PolyX";
  play.addEventListener("click", () => {
    if (actions?.playMap) actions.playMap();
    else navigate("polyx");
  });

  host.append(brand, fileWrap, edit, view, play);
}

export function mountRibbon(
  host: HTMLElement,
  session: StudioSession,
  undo: UndoStack,
  actions: {
    insertPart: () => void;
    insertModel: () => void;
    insertScript: () => void;
    insertModuleScript: () => void;
    insertTool: () => void;
    insertScreenGui: () => void;
    insertViewportFrame: () => void;
    insertAnimation: () => void;
    insertRemoteEvent: () => void;
    deleteSelected: () => void;
    undo: () => void;
    redo: () => void;
    playMap: () => void;
  },
) {
  host.className = "hx-ribbon";
  host.innerHTML = "";

  const toolsGroup = document.createElement("div");
  toolsGroup.className = "hx-ribbon__group";
  const toolsRow = document.createElement("div");
  toolsRow.className = "hx-ribbon__tools";

  const toolBtns = new Map<StudioTool, HTMLButtonElement>();

  const addTool = (id: StudioTool, label: string, icon: string) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hx-tool";
    btn.dataset.tool = id;
    const ic = document.createElement("span");
    ic.className = "hx-tool__icon";
    ic.textContent = icon;
    const lb = document.createElement("span");
    lb.textContent = label;
    btn.append(ic, lb);
    btn.addEventListener("click", () => session.setTool(id));
    toolsRow.appendChild(btn);
    toolBtns.set(id, btn);
  };

  addTool("select", "Select", "⬚");
  addTool("move", "Move", "✥");
  addTool("scale", "Scale", "⛶");
  addTool("rotate", "Rotate", "⟳");

  const toolsLabel = document.createElement("div");
  toolsLabel.className = "hx-ribbon__label";
  toolsLabel.textContent = "Tools";
  toolsGroup.append(toolsRow, toolsLabel);

  const historyGroup = document.createElement("div");
  historyGroup.className = "hx-ribbon__group";
  const historyRow = document.createElement("div");
  historyRow.className = "hx-ribbon__tools";

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "hx-tool";
  undoBtn.innerHTML =
    '<span class="hx-tool__icon">↶</span><span>Undo</span>';
  undoBtn.addEventListener("click", () => actions.undo());

  const redoBtn = document.createElement("button");
  redoBtn.type = "button";
  redoBtn.className = "hx-tool";
  redoBtn.innerHTML =
    '<span class="hx-tool__icon">↷</span><span>Redo</span>';
  redoBtn.addEventListener("click", () => actions.redo());

  historyRow.append(undoBtn, redoBtn);
  const historyLabel = document.createElement("div");
  historyLabel.className = "hx-ribbon__label";
  historyLabel.textContent = "History";
  historyGroup.append(historyRow, historyLabel);

  const insertGroup = document.createElement("div");
  insertGroup.className = "hx-ribbon__group";
  const insertRow = document.createElement("div");
  insertRow.className = "hx-ribbon__tools";

  const partBtn = document.createElement("button");
  partBtn.type = "button";
  partBtn.className = "hx-tool";
  partBtn.innerHTML =
    '<span class="hx-tool__icon">■</span><span>Part</span>';
  partBtn.addEventListener("click", () => actions.insertPart());

  const modelBtn = document.createElement("button");
  modelBtn.type = "button";
  modelBtn.className = "hx-tool";
  modelBtn.innerHTML =
    '<span class="hx-tool__icon">▦</span><span>Model</span>';
  modelBtn.addEventListener("click", () => actions.insertModel());

  const scriptBtn = document.createElement("button");
  scriptBtn.type = "button";
  scriptBtn.className = "hx-tool";
  scriptBtn.innerHTML =
    '<span class="hx-tool__icon">⌘</span><span>Script</span>';
  scriptBtn.title = "TypeScript Script (runs on Play)";
  scriptBtn.addEventListener("click", () => actions.insertScript());

  const moduleBtn = document.createElement("button");
  moduleBtn.type = "button";
  moduleBtn.className = "hx-tool";
  moduleBtn.innerHTML =
    '<span class="hx-tool__icon">⧉</span><span>Module</span>';
  moduleBtn.title = "ModuleScript — require() from Scripts";
  moduleBtn.addEventListener("click", () => actions.insertModuleScript());

  const toolBtn = document.createElement("button");
  toolBtn.type = "button";
  toolBtn.className = "hx-tool";
  toolBtn.innerHTML =
    '<span class="hx-tool__icon">⚒</span><span>Tool</span>';
  toolBtn.title = "Tool — Handle parts + scripts, equips on Play";
  toolBtn.addEventListener("click", () => actions.insertTool());

  const guiBtn = document.createElement("button");
  guiBtn.type = "button";
  guiBtn.className = "hx-tool";
  guiBtn.innerHTML =
    '<span class="hx-tool__icon">▦</span><span>GUI</span>';
  guiBtn.title = "ScreenGui — interactable UI with scripts";
  guiBtn.addEventListener("click", () => actions.insertScreenGui());

  const vfBtn = document.createElement("button");
  vfBtn.type = "button";
  vfBtn.className = "hx-tool";
  vfBtn.innerHTML =
    '<span class="hx-tool__icon">⧉</span><span>Viewport</span>';
  vfBtn.title = "ViewportFrame — 3D objects / test rig in GUI";
  vfBtn.addEventListener("click", () => actions.insertViewportFrame());

  const animBtn = document.createElement("button");
  animBtn.type = "button";
  animBtn.className = "hx-tool";
  animBtn.innerHTML =
    '<span class="hx-tool__icon">⏯</span><span>Anim</span>';
  animBtn.title = "Keyframe Animation (preview on test rig)";
  animBtn.addEventListener("click", () => actions.insertAnimation());

  const remoteBtn = document.createElement("button");
  remoteBtn.type = "button";
  remoteBtn.className = "hx-tool";
  remoteBtn.innerHTML =
    '<span class="hx-tool__icon">⇄</span><span>Remote</span>';
  remoteBtn.title = "RemoteEvent — client/server messaging";
  remoteBtn.addEventListener("click", () => actions.insertRemoteEvent());

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "hx-tool";
  delBtn.innerHTML =
    '<span class="hx-tool__icon">✕</span><span>Delete</span>';
  delBtn.addEventListener("click", () => actions.deleteSelected());

  insertRow.append(
    partBtn,
    modelBtn,
    scriptBtn,
    moduleBtn,
    toolBtn,
    guiBtn,
    vfBtn,
    animBtn,
    remoteBtn,
    delBtn,
  );
  const insertLabel = document.createElement("div");
  insertLabel.className = "hx-ribbon__label";
  insertLabel.textContent = "Insert";
  insertGroup.append(insertRow, insertLabel);

  const testGroup = document.createElement("div");
  testGroup.className = "hx-ribbon__group";
  const testRow = document.createElement("div");
  testRow.className = "hx-ribbon__tools";

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "hx-tool hx-tool--play";
  playBtn.innerHTML =
    '<span class="hx-tool__icon">▶</span><span>Play</span>';
  playBtn.title = "Play this HedronX map in PolyX";
  playBtn.addEventListener("click", () => actions.playMap());
  testRow.appendChild(playBtn);

  const testLabel = document.createElement("div");
  testLabel.className = "hx-ribbon__label";
  testLabel.textContent = "Test";
  testGroup.append(testRow, testLabel);

  host.append(toolsGroup, historyGroup, insertGroup, testGroup);

  const syncTools = () => {
    for (const [id, btn] of toolBtns) {
      btn.classList.toggle("hx-tool--active", session.tool === id);
    }
  };
  const syncHistory = () => {
    undoBtn.disabled = !undo.canUndo;
    redoBtn.disabled = !undo.canRedo;
    undoBtn.title = undo.undoLabel ? `Undo ${undo.undoLabel}` : "Undo";
    redoBtn.title = undo.redoLabel ? `Redo ${undo.redoLabel}` : "Redo";
    undoBtn.classList.toggle("hx-tool--disabled", !undo.canUndo);
    redoBtn.classList.toggle("hx-tool--disabled", !undo.canRedo);
  };

  syncTools();
  syncHistory();
  session.subscribe(syncTools);
  undo.subscribe(syncHistory);
}

import { Animation } from "../../instances/Animation";
import {
  Frame,
  ScreenGui,
  TextButton,
  TextLabel,
  ViewportFrame,
} from "../../instances/Gui";
import type { Instance } from "../../instances/Instance";
import { Model } from "../../instances/Model";
import { Part } from "../../instances/Part";
import { BindableEvent, RemoteEvent } from "../../instances/RemoteEvent";
import { ModuleScript, Script } from "../../instances/Script";
import { Tool } from "../../instances/Tool";
import { Workspace } from "../../instances/Workspace";
import type { StudioSession } from "../StudioSession";

function classIcon(inst: Instance): string {
  if (inst instanceof Workspace) return "▣";
  if (inst instanceof Model) return "▦";
  if (inst instanceof Part) return "■";
  if (inst instanceof Script) return "⌘";
  if (inst instanceof ModuleScript) return "⧉";
  if (inst instanceof Tool) return "⚒";
  if (inst instanceof RemoteEvent) return "⇄";
  if (inst instanceof BindableEvent) return "⇔";
  if (inst instanceof Animation) return "⏯";
  if (inst instanceof ViewportFrame) return "▣";
  if (inst instanceof ScreenGui) return "▤";
  if (inst instanceof TextButton) return "▣";
  if (inst instanceof TextLabel) return "T";
  if (inst instanceof Frame) return "▭";
  return "○";
}

export function mountExplorer(
  host: HTMLElement,
  workspace: Workspace,
  session: StudioSession,
  actions: {
    insertPart: (parent?: Instance) => void;
    insertModel: (parent?: Instance) => void;
    insertScript: (parent?: Instance) => void;
    insertModuleScript: (parent?: Instance) => void;
    insertTool: (parent?: Instance) => void;
    insertScreenGui: (parent?: Instance) => void;
    insertViewportFrame: (parent?: Instance) => void;
    insertAnimation: (parent?: Instance) => void;
    insertRemoteEvent: (parent?: Instance) => void;
    deleteSelected: () => void;
  },
) {
  host.innerHTML = "";
  host.className = "hx-panel hx-explorer";

  const header = document.createElement("div");
  header.className = "hx-panel__header hx-panel__header--split";

  const title = document.createElement("span");
  title.textContent = "Explorer";

  const tools = document.createElement("div");
  tools.className = "hx-explorer__tools";

  const mkBtn = (label: string, titleText: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hx-explorer__btn";
    b.textContent = label;
    b.title = titleText;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  };

  tools.append(
    mkBtn("+ Part", "Insert Part under selection", () => actions.insertPart()),
    mkBtn("+ Model", "Insert Model", () => actions.insertModel()),
    mkBtn("+ Script", "Insert Script", () => actions.insertScript()),
    mkBtn("+ Module", "Insert ModuleScript", () =>
      actions.insertModuleScript(),
    ),
    mkBtn("+ Tool", "Insert Tool", () => actions.insertTool()),
    mkBtn("+ GUI", "Insert ScreenGui", () => actions.insertScreenGui()),
    mkBtn("+ Viewport", "Insert ViewportFrame", () =>
      actions.insertViewportFrame(),
    ),
    mkBtn("+ Anim", "Insert Animation", () => actions.insertAnimation()),
    mkBtn("+ Remote", "Insert RemoteEvent", () => actions.insertRemoteEvent()),
  );
  header.append(title, tools);

  const body = document.createElement("div");
  body.className = "hx-panel__body";
  const tree = document.createElement("ul");
  tree.className = "hx-tree";
  body.appendChild(tree);
  host.append(header, body);

  const menu = document.createElement("div");
  menu.className = "hx-ctx";
  menu.hidden = true;
  document.body.appendChild(menu);

  function hideMenu() {
    menu.hidden = true;
    menu.innerHTML = "";
  }

  function showMenu(x: number, y: number, inst: Instance) {
    hideMenu();
    menu.hidden = false;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const addItem = (label: string, fn: () => void, danger = false) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "hx-ctx__item" + (danger ? " hx-ctx__item--danger" : "");
      item.textContent = label;
      item.addEventListener("click", () => {
        hideMenu();
        fn();
      });
      menu.appendChild(item);
    };

    session.select(inst);

    const insertUnder =
      inst instanceof Workspace ||
      inst instanceof Model ||
      inst instanceof Part ||
      inst instanceof Tool ||
      inst instanceof ScreenGui ||
      inst instanceof Frame ||
      inst instanceof ViewportFrame
        ? inst
        : null;

    if (insertUnder) {
      addItem("Insert Part", () => actions.insertPart(insertUnder));
      addItem("Insert Model", () => actions.insertModel(insertUnder));
      addItem("Insert Script", () => actions.insertScript(insertUnder));
      addItem("Insert ModuleScript", () =>
        actions.insertModuleScript(insertUnder),
      );
      addItem("Insert Tool", () => actions.insertTool(insertUnder));
      addItem("Insert Animation", () => actions.insertAnimation(insertUnder));
      addItem("Insert RemoteEvent", () =>
        actions.insertRemoteEvent(insertUnder),
      );
      if (inst instanceof Workspace || inst instanceof Model) {
        addItem("Insert ScreenGui", () => actions.insertScreenGui(insertUnder));
      }
      if (
        inst instanceof Workspace ||
        inst instanceof Model ||
        inst instanceof ScreenGui ||
        inst instanceof Frame
      ) {
        addItem("Insert ViewportFrame", () =>
          actions.insertViewportFrame(insertUnder),
        );
      }
    }

    if (!(inst instanceof Workspace)) {
      addItem("Delete", () => actions.deleteSelected(), true);
    }
  }

  const onDocClick = () => hideMenu();
  document.addEventListener("click", onDocClick);

  function rowFor(inst: Instance): HTMLLIElement {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "hx-tree__row";
    if (session.selected === inst) row.classList.add("hx-tree__row--selected");
    const icon = document.createElement("span");
    icon.className = "hx-tree__icon";
    icon.textContent = classIcon(inst);
    const name = document.createElement("span");
    name.className = "hx-tree__name";
    name.textContent = inst.name;
    row.append(icon, name);
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      hideMenu();
      session.select(inst);
    });
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showMenu(e.clientX, e.clientY, inst);
    });
    li.appendChild(row);
    if (inst.children.length > 0) {
      const ul = document.createElement("ul");
      for (const child of inst.children) ul.appendChild(rowFor(child));
      li.appendChild(ul);
    }
    return li;
  }

  function refresh() {
    tree.innerHTML = "";
    tree.appendChild(rowFor(workspace));
  }

  refresh();
  session.subscribe(refresh);
  session.onHierarchy(refresh);

  return {
    refresh,
    dispose: () => {
      document.removeEventListener("click", onDocClick);
      hideMenu();
      menu.remove();
    },
  };
}

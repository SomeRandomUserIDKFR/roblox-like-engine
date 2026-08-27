import type { RigKeyframe } from "../../instances/Animation";
import { Animation } from "../../instances/Animation";
import { Model } from "../../instances/Model";
import {
  Part,
  PART_MATERIAL_LABELS,
  PART_MATERIALS,
  PART_SHAPE_LABELS,
  PART_SHAPES,
  POLYX_MATERIALS,
  type PartMaterial,
  type PartShape,
} from "../../instances/Part";
import { ModuleScript, Script } from "../../instances/Script";
import { Tool } from "../../instances/Tool";
import {
  Frame,
  ScreenGui,
  TextButton,
  TextLabel,
  ViewportFrame,
} from "../../instances/Gui";
import { isSourceScript } from "../../scripting/ScriptRuntime";
import { Workspace } from "../../instances/Workspace";
import type { StudioSession } from "../StudioSession";
import { keyframeEditorRows } from "./AnimationPreview";
import {
  captureGuiPose,
  capturePartPose,
  captureScriptPose,
  captureToolPose,
  guiEditCommand,
  guiPosesEqual,
  posesEqual,
  scriptEditCommand,
  scriptPosesEqual,
  toolEditCommand,
  toolPosesEqual,
  transformCommand,
  type PartPose,
} from "../undo/commands";
import type { UndoStack } from "../undo/UndoStack";
import type { UndoCommand } from "../undo/UndoStack";

function hexInput(color: { getHexString(): string }) {
  return `#${color.getHexString()}`;
}

function renameCommand(
  inst: { name: string },
  before: string,
  after: string,
): UndoCommand {
  return {
    label: "Rename",
    undo: () => {
      inst.name = before;
    },
    redo: () => {
      inst.name = after;
    },
  };
}

export function mountProperties(
  host: HTMLElement,
  session: StudioSession,
  undo: UndoStack,
  onEdited: () => void,
  opts?: {
    captureAnimPose?: () => RigKeyframe | null;
  },
) {
  host.innerHTML = "";
  host.className = "hx-panel hx-panel--right hx-properties";

  const header = document.createElement("div");
  header.className = "hx-panel__header";
  header.textContent = "Properties";

  const body = document.createElement("div");
  body.className = "hx-panel__body";
  host.append(header, body);

  function commitPart(part: Part, before: PartPose, label = "Edit") {
    const after = capturePartPose(part);
    if (posesEqual(before, after)) return;
    undo.pushApplied(transformCommand(part, before, after, label));
    onEdited();
  }

  function render() {
    body.innerHTML = "";
    const sel = session.selected;

    if (!sel) {
      const empty = document.createElement("p");
      empty.className = "hx-prop-empty";
      empty.textContent = "Select an object in the Explorer or Viewport.";
      body.appendChild(empty);
      return;
    }

    const table = document.createElement("table");
    table.className = "hx-prop-table";

    const addSection = (title: string) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.colSpan = 2;
      th.textContent = title;
      tr.appendChild(th);
      table.appendChild(tr);
    };

    const addRow = (label: string, control: HTMLElement) => {
      const tr = document.createElement("tr");
      const tdL = document.createElement("td");
      tdL.textContent = label;
      const tdR = document.createElement("td");
      tdR.appendChild(control);
      tr.append(tdL, tdR);
      table.appendChild(tr);
    };

    const sectionTitle =
      sel instanceof Part
        ? "Part"
        : sel instanceof Model
          ? "Model"
          : sel instanceof Script
            ? "Script"
            : sel instanceof ModuleScript
              ? "ModuleScript"
              : sel instanceof Tool
                ? "Tool"
                : sel instanceof Animation
                  ? "Animation"
                  : sel instanceof ViewportFrame
                    ? "ViewportFrame"
                    : sel instanceof ScreenGui
                      ? "ScreenGui"
                      : sel instanceof TextButton
                        ? "TextButton"
                        : sel instanceof TextLabel
                          ? "TextLabel"
                          : sel instanceof Frame
                            ? "Frame"
                            : sel instanceof Workspace
                              ? "Workspace"
                              : "Instance";
    addSection(sectionTitle);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = sel.name;
    let nameBefore = sel.name;
    nameInput.addEventListener("focus", () => {
      nameBefore = sel.name;
    });
    nameInput.addEventListener("change", () => {
      const next = nameInput.value.trim() || sel.name;
      if (next === nameBefore) return;
      sel.name = next;
      if (sel instanceof Part) sel.sync();
      undo.pushApplied(renameCommand(sel, nameBefore, next));
      onEdited();
    });
    addRow("Name", nameInput);

    const classEl = document.createElement("input");
    classEl.type = "text";
    classEl.readOnly = true;
    classEl.value = sectionTitle;
    addRow("ClassName", classEl);

    if (sel instanceof Part) {
      const part = sel;

      if (part.isTestRig) {
        const tip = document.createElement("div");
        tip.className = "hx-script-hint";
        tip.textContent =
          "Test Rig limb — use Rotate (4) / Move (2), then + Keyframe in the Test Rig panel to capture this pose.";
        const tipRow = document.createElement("tr");
        const tipTd = document.createElement("td");
        tipTd.colSpan = 2;
        tipTd.appendChild(tip);
        tipRow.appendChild(tipTd);
        table.appendChild(tipRow);
      }

      {
        const shape = document.createElement("select");
        for (const s of PART_SHAPES) {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = PART_SHAPE_LABELS[s];
          if (part.shape === s) opt.selected = true;
          shape.appendChild(opt);
        }
        shape.addEventListener("change", () => {
          const before = capturePartPose(part);
          part.setShape(shape.value as PartShape);
          commitPart(part, before, "Shape");
        });
        addRow("Shape", shape);
      }

      const vec3 = (
        label: string,
        get: () => { x: number; y: number; z: number },
        set: (x: number, y: number, z: number) => void,
      ) => {
        const wrap = document.createElement("div");
        wrap.className = "hx-vec3";
        const v = get();
        for (const axis of ["x", "y", "z"] as const) {
          const lab = document.createElement("label");
          lab.textContent = axis.toUpperCase();
          const inp = document.createElement("input");
          inp.type = "number";
          inp.step = "0.1";
          inp.value = String(Number(v[axis].toFixed(3)));
          let before: PartPose | null = null;
          inp.addEventListener("focus", () => {
            before = capturePartPose(part);
          });
          inp.addEventListener("change", () => {
            const cur = get();
            const n = Number(inp.value);
            if (!Number.isFinite(n)) return;
            const next = { x: cur.x, y: cur.y, z: cur.z, [axis]: n };
            set(next.x, next.y, next.z);
            part.sync();
            if (before) commitPart(part, before, label);
          });
          lab.appendChild(inp);
          wrap.appendChild(lab);
        }
        addRow(label, wrap);
      };

      vec3(
        "Position",
        () => part.position,
        (x, y, z) => part.position.set(x, y, z),
      );
      vec3(
        "Size",
        () => part.size,
        (x, y, z) =>
          part.size.set(Math.max(0.05, x), Math.max(0.05, y), Math.max(0.05, z)),
      );

      {
        const wrap = document.createElement("div");
        wrap.className = "hx-vec3";
        for (const axis of ["x", "y", "z"] as const) {
          const lab = document.createElement("label");
          lab.textContent = axis.toUpperCase();
          const inp = document.createElement("input");
          inp.type = "number";
          inp.step = "1";
          inp.value = String(
            Number(((part.rotation[axis] * 180) / Math.PI).toFixed(2)),
          );
          let before: PartPose | null = null;
          inp.addEventListener("focus", () => {
            before = capturePartPose(part);
          });
          inp.addEventListener("change", () => {
            const deg = Number(inp.value);
            if (!Number.isFinite(deg)) return;
            part.rotation[axis] = (deg * Math.PI) / 180;
            part.sync();
            if (before) commitPart(part, before, "Rotation");
          });
          lab.appendChild(inp);
          wrap.appendChild(lab);
        }
        addRow("Rotation", wrap);
      }

      const color = document.createElement("input");
      color.type = "color";
      color.value = hexInput(part.color);
      let colorBefore: PartPose | null = null;
      color.addEventListener("focus", () => {
        colorBefore = capturePartPose(part);
      });
      color.addEventListener("input", () => {
        part.color.set(color.value);
        part.sync();
      });
      color.addEventListener("change", () => {
        if (colorBefore) commitPart(part, colorBefore, "Color");
      });
      addRow("Color", color);

      const mat = document.createElement("select");
      const classic = document.createElement("optgroup");
      classic.label = "Classic";
      const polyx = document.createElement("optgroup");
      polyx.label = "PolyX / HedronX";
      const polyxSet = new Set<string>(POLYX_MATERIALS);
      for (const m of PART_MATERIALS) {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = PART_MATERIAL_LABELS[m];
        if (part.material === m) opt.selected = true;
        (polyxSet.has(m) ? polyx : classic).appendChild(opt);
      }
      mat.append(classic, polyx);
      mat.addEventListener("change", () => {
        const before = capturePartPose(part);
        part.setMaterial(mat.value as PartMaterial);
        commitPart(part, before, "Material");
      });
      addRow("Material", mat);

      const transp = document.createElement("input");
      transp.type = "number";
      transp.min = "0";
      transp.max = "1";
      transp.step = "0.05";
      transp.value = String(part.transparency);
      let transpBefore: PartPose | null = null;
      transp.addEventListener("focus", () => {
        transpBefore = capturePartPose(part);
      });
      transp.addEventListener("change", () => {
        part.transparency = Math.min(1, Math.max(0, Number(transp.value) || 0));
        part.sync();
        if (transpBefore) commitPart(part, transpBefore, "Transparency");
      });
      addRow("Transparency", transp);

      const refl = document.createElement("input");
      refl.type = "number";
      refl.min = "0";
      refl.max = "1";
      refl.step = "0.05";
      refl.value = String(part.reflectance);
      let reflBefore: PartPose | null = null;
      refl.addEventListener("focus", () => {
        reflBefore = capturePartPose(part);
      });
      refl.addEventListener("change", () => {
        part.reflectance = Math.min(1, Math.max(0, Number(refl.value) || 0));
        part.sync();
        if (reflBefore) commitPart(part, reflBefore, "Reflectance");
      });
      addRow("Reflectance", refl);

      const boolRow = (
        label: string,
        get: () => boolean,
        set: (v: boolean) => void,
        needsSync = false,
      ) => {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = get();
        cb.addEventListener("change", () => {
          const before = capturePartPose(part);
          set(cb.checked);
          if (needsSync) part.sync();
          commitPart(part, before, label);
        });
        addRow(label, cb);
      };

      addSection("Behavior");
      boolRow("Anchored", () => part.anchored, (v) => {
        part.anchored = v;
      });
      boolRow("Solid", () => part.canCollide, (v) => {
        part.canCollide = v;
      });
      boolRow("Detects Touch", () => part.canTouch, (v) => {
        part.canTouch = v;
      });
      boolRow("Clickable", () => part.canQuery, (v) => {
        part.canQuery = v;
      });
      boolRow(
        "Casts Shadow",
        () => part.castShadow,
        (v) => {
          part.castShadow = v;
        },
        true,
      );
      boolRow("No Mass", () => part.massless, (v) => {
        part.massless = v;
      });
      boolRow("Locked", () => part.locked, (v) => {
        part.locked = v;
      });

      addSection("Traits");
      boolRow("Slippery", () => part.slippery, (v) => {
        part.slippery = v;
      });
      boolRow("Bouncy", () => part.bouncy, (v) => {
        part.bouncy = v;
      });
      boolRow("Can Break", () => part.breakable, (v) => {
        part.breakable = v;
      });
      boolRow("Conducts Energy", () => part.conductive, (v) => {
        part.conductive = v;
      });
      boolRow("Floats in Water", () => part.buoyant, (v) => {
        part.buoyant = v;
      });
      boolRow("Magnetic", () => part.magnetic, (v) => {
        part.magnetic = v;
        if (v && !part.magneticPull && !part.magneticPush) {
          part.magneticPull = true;
          part.magneticPush = false;
        }
        if (!v) {
          part.magneticPull = false;
          part.magneticPush = false;
        }
      });
      if (part.magnetic) {
        boolRow("  Pull", () => part.magneticPull, (v) => {
          part.magneticPull = v;
          if (v) part.magneticPush = false;
          if (!part.magneticPull && !part.magneticPush) {
            part.magneticPull = true;
          }
        });
        boolRow("  Push", () => part.magneticPush, (v) => {
          part.magneticPush = v;
          if (v) part.magneticPull = false;
          if (!part.magneticPull && !part.magneticPush) {
            part.magneticPush = true;
          }
        });
      }
      boolRow(
        "See Both Sides",
        () => part.doubleSided,
        (v) => {
          part.doubleSided = v;
        },
        true,
      );
      boolRow(
        "Glows",
        () => part.emitLight,
        (v) => {
          part.emitLight = v;
        },
        true,
      );
      boolRow("Grippy", () => part.absorbent, (v) => {
        part.absorbent = v;
      });
      boolRow(
        "Frosted",
        () => part.frost,
        (v) => {
          part.frost = v;
        },
        true,
      );
      boolRow(
        "Water",
        () => part.isWater,
        (v) => {
          part.isWater = v;
        },
        true,
      );
    } else if (isSourceScript(sel)) {
      const script = sel;

      const enabled = document.createElement("input");
      enabled.type = "checkbox";
      enabled.checked = script.enabled;
      enabled.addEventListener("change", () => {
        const before = captureScriptPose(script);
        script.enabled = enabled.checked;
        const after = captureScriptPose(script);
        if (!scriptPosesEqual(before, after)) {
          undo.pushApplied(
            scriptEditCommand(script, before, after, "Enabled"),
          );
          onEdited();
        }
      });
      addRow("Enabled", enabled);

      addSection("Source (TypeScript)");
      const hint = document.createElement("div");
      hint.className = "hx-script-hint";
      hint.textContent =
        script instanceof ModuleScript
          ? "export functions, then require(\"Name\") from a Script. Use py(\"…\") for one-shot math."
          : "Runs on Play. Globals: print, wait, task, py, require, workspace, game, Players, DataStoreService, Vector3, LocalPlayer, Humanoid, tool.";
      const hintRow = document.createElement("tr");
      const hintTd = document.createElement("td");
      hintTd.colSpan = 2;
      hintTd.appendChild(hint);
      hintRow.appendChild(hintTd);
      table.appendChild(hintRow);

      const area = document.createElement("textarea");
      area.className = "hx-script-source";
      area.spellcheck = false;
      area.value = script.source;
      let sourceBefore = script.source;
      area.addEventListener("focus", () => {
        sourceBefore = script.source;
      });
      area.addEventListener("input", () => {
        script.source = area.value;
      });
      area.addEventListener("blur", () => {
        const afterSrc = area.value;
        if (afterSrc === sourceBefore) return;
        script.source = afterSrc;
        undo.pushApplied(
          scriptEditCommand(
            script,
            { name: script.name, source: sourceBefore, enabled: script.enabled },
            {
              name: script.name,
              source: afterSrc,
              enabled: script.enabled,
            },
            "Edit Source",
          ),
        );
        sourceBefore = afterSrc;
        onEdited();
      });

      const srcRow = document.createElement("tr");
      const srcTd = document.createElement("td");
      srcTd.colSpan = 2;
      srcTd.appendChild(area);
      srcRow.appendChild(srcTd);
      table.appendChild(srcRow);
    } else if (sel instanceof Tool) {
      const tool = sel;
      const commitTool = (before: ReturnType<typeof captureToolPose>, label: string) => {
        const after = captureToolPose(tool);
        if (toolPosesEqual(before, after)) return;
        undo.pushApplied(toolEditCommand(tool, before, after, label));
        onEdited();
      };

      const enabled = document.createElement("input");
      enabled.type = "checkbox";
      enabled.checked = tool.enabled;
      enabled.addEventListener("change", () => {
        const before = captureToolPose(tool);
        tool.enabled = enabled.checked;
        commitTool(before, "Enabled");
      });
      addRow("Enabled", enabled);

      const icon = document.createElement("input");
      icon.type = "text";
      icon.value = tool.icon;
      icon.addEventListener("change", () => {
        const before = captureToolPose(tool);
        tool.icon = icon.value || "⚒";
        commitTool(before, "Icon");
      });
      addRow("Icon", icon);

      const tip = document.createElement("input");
      tip.type = "text";
      tip.value = tool.toolTip;
      tip.placeholder = tool.name;
      tip.addEventListener("change", () => {
        const before = captureToolPose(tool);
        tool.toolTip = tip.value;
        commitTool(before, "ToolTip");
      });
      addRow("ToolTip", tip);

      const color = document.createElement("input");
      color.type = "color";
      color.value = /^#[0-9a-fA-F]{6}$/.test(tool.color)
        ? tool.color
        : "#c9a227";
      color.addEventListener("change", () => {
        const before = captureToolPose(tool);
        tool.color = color.value;
        commitTool(before, "Color");
      });
      addRow("HotbarColor", color);

      const req = document.createElement("input");
      req.type = "checkbox";
      req.checked = tool.requiresHandle;
      req.addEventListener("change", () => {
        const before = captureToolPose(tool);
        tool.requiresHandle = req.checked;
        commitTool(before, "RequiresHandle");
      });
      addRow("RequiresHandle", req);

      const hint = document.createElement("div");
      hint.className = "hx-script-hint";
      hint.textContent =
        "Child Parts form the held model (Handle = grip). Add a Script for tool.Activated(() => {}).";
      const hintRow = document.createElement("tr");
      const hintTd = document.createElement("td");
      hintTd.colSpan = 2;
      hintTd.appendChild(hint);
      hintRow.appendChild(hintTd);
      table.appendChild(hintRow);
    } else if (
      sel instanceof ScreenGui ||
      sel instanceof Frame ||
      sel instanceof TextLabel ||
      sel instanceof TextButton ||
      sel instanceof ViewportFrame
    ) {
      const gui = sel;
      const commitGui = (
        before: ReturnType<typeof captureGuiPose>,
        label: string,
      ) => {
        const after = captureGuiPose(gui);
        if (guiPosesEqual(before, after)) return;
        undo.pushApplied(guiEditCommand(gui, before, after, label));
        onEdited();
      };

      if (gui instanceof ScreenGui) {
        const enabled = document.createElement("input");
        enabled.type = "checkbox";
        enabled.checked = gui.enabled;
        enabled.addEventListener("change", () => {
          const before = captureGuiPose(gui);
          gui.enabled = enabled.checked;
          commitGui(before, "Enabled");
        });
        addRow("Enabled", enabled);

        const order = document.createElement("input");
        order.type = "number";
        order.step = "1";
        order.value = String(gui.displayOrder);
        order.addEventListener("change", () => {
          const before = captureGuiPose(gui);
          gui.displayOrder = Number(order.value) || 0;
          commitGui(before, "DisplayOrder");
        });
        addRow("DisplayOrder", order);
      } else {
        const visible = document.createElement("input");
        visible.type = "checkbox";
        visible.checked = gui.visible;
        visible.addEventListener("change", () => {
          const before = captureGuiPose(gui);
          gui.visible = visible.checked;
          commitGui(before, "Visible");
        });
        addRow("Visible", visible);

        const num = (
          label: string,
          get: () => number,
          set: (n: number) => void,
          step = "0.01",
        ) => {
          const inp = document.createElement("input");
          inp.type = "number";
          inp.step = step;
          inp.value = String(get());
          inp.addEventListener("change", () => {
            const before = captureGuiPose(gui);
            const n = Number(inp.value);
            if (!Number.isFinite(n)) return;
            set(n);
            commitGui(before, label);
          });
          addRow(label, inp);
        };

        num("AnchorX", () => gui.anchorX, (n) => {
          gui.anchorX = n;
        });
        num("AnchorY", () => gui.anchorY, (n) => {
          gui.anchorY = n;
        });
        num("SizeX", () => gui.sizeX, (n) => {
          gui.sizeX = n;
        });
        num("SizeY", () => gui.sizeY, (n) => {
          gui.sizeY = n;
        });
        num(
          "OffsetX",
          () => gui.offsetX,
          (n) => {
            gui.offsetX = n;
          },
          "1",
        );
        num(
          "OffsetY",
          () => gui.offsetY,
          (n) => {
            gui.offsetY = n;
          },
          "1",
        );

        const bg = document.createElement("input");
        bg.type = "color";
        bg.value = `#${gui.backgroundColor.toString(16).padStart(6, "0")}`;
        bg.addEventListener("change", () => {
          const before = captureGuiPose(gui);
          gui.backgroundColor = Number.parseInt(bg.value.slice(1), 16);
          commitGui(before, "BackgroundColor");
        });
        addRow("Background", bg);

        num("BgTransparency", () => gui.backgroundTransparency, (n) => {
          gui.backgroundTransparency = Math.min(1, Math.max(0, n));
        });

        if (gui instanceof TextLabel) {
          const text = document.createElement("input");
          text.type = "text";
          text.value = gui.text;
          text.addEventListener("change", () => {
            const before = captureGuiPose(gui);
            gui.text = text.value;
            commitGui(before, "Text");
          });
          addRow("Text", text);

          const tc = document.createElement("input");
          tc.type = "color";
          tc.value = `#${gui.textColor.toString(16).padStart(6, "0")}`;
          tc.addEventListener("change", () => {
            const before = captureGuiPose(gui);
            gui.textColor = Number.parseInt(tc.value.slice(1), 16);
            commitGui(before, "TextColor");
          });
          addRow("TextColor", tc);

          num(
            "TextSize",
            () => gui.textSize,
            (n) => {
              gui.textSize = Math.max(8, n);
            },
            "1",
          );

          if (gui instanceof TextButton) {
            const hint = document.createElement("div");
            hint.className = "hx-script-hint";
            hint.textContent =
              'In a Script: find the button, then button.Activated(() => print("hi"))';
            const hintRow = document.createElement("tr");
            const hintTd = document.createElement("td");
            hintTd.colSpan = 2;
            hintTd.appendChild(hint);
            hintRow.appendChild(hintTd);
            table.appendChild(hintRow);
          }
        }

        if (gui instanceof ViewportFrame) {
          addSection("Viewport");
          const obj = document.createElement("input");
          obj.type = "text";
          obj.value = gui.objectName;
          obj.placeholder = "Part or Model name";
          obj.addEventListener("change", () => {
            const before = captureGuiPose(gui);
            gui.objectName = obj.value.trim();
            commitGui(before, "ObjectName");
          });
          addRow("ObjectName", obj);

          const rig = document.createElement("input");
          rig.type = "checkbox";
          rig.checked = gui.showTestRig;
          rig.addEventListener("change", () => {
            const before = captureGuiPose(gui);
            gui.showTestRig = rig.checked;
            commitGui(before, "ShowTestRig");
          });
          addRow("ShowTestRig", rig);

          const an = document.createElement("input");
          an.type = "text";
          an.value = gui.animationName;
          an.placeholder = "WaveAnim";
          an.addEventListener("change", () => {
            const before = captureGuiPose(gui);
            gui.animationName = an.value.trim();
            commitGui(before, "AnimationName");
          });
          addRow("AnimationName", an);

          num("CameraDistance", () => gui.cameraDistance, (n) => {
            gui.cameraDistance = Math.max(1, n);
          }, "0.1");
          num("CameraYaw", () => gui.cameraYaw, (n) => {
            gui.cameraYaw = n;
          }, "0.05");
          num("CameraPitch", () => gui.cameraPitch, (n) => {
            gui.cameraPitch = n;
          }, "0.05");
        }
      }
    } else if (sel instanceof Animation) {
      const anim = sel;
      const looped = document.createElement("input");
      looped.type = "checkbox";
      looped.checked = anim.looped;
      looped.addEventListener("change", () => {
        anim.looped = looped.checked;
        onEdited();
      });
      addRow("Looped", looped);

      const len = document.createElement("input");
      len.type = "number";
      len.step = "0.05";
      len.value = String(anim.length);
      len.addEventListener("change", () => {
        anim.length = Math.max(0.05, Number(len.value) || 1);
        onEdited();
      });
      addRow("Length", len);

      addSection("Keyframes");
      const hint = document.createElement("div");
      hint.className = "hx-script-hint";
      hint.textContent =
        "A physical Test Rig spawns in the viewport. Select limbs → Rotate (4) / Move (2), then + Keyframe from pose.";
      const hintRow = document.createElement("tr");
      const hintTd = document.createElement("td");
      hintTd.colSpan = 2;
      hintTd.appendChild(hint);
      hintRow.appendChild(hintTd);
      table.appendChild(hintRow);

      const editorRow = document.createElement("tr");
      const editorTd = document.createElement("td");
      editorTd.colSpan = 2;
      editorTd.appendChild(
        keyframeEditorRows(anim, () => {
          onEdited();
        }, opts?.captureAnimPose),
      );
      editorRow.appendChild(editorTd);
      table.appendChild(editorRow);
    }

    body.appendChild(table);
  }

  render();
  session.subscribe(render);

  return { refresh: render };
}

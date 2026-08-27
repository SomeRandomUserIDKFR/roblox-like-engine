import { createDefaultScreenGui, createDefaultViewportFrame } from "../gui/GuiRuntime";
import {
  createCheerAnimation,
  createWaveAnimation,
} from "../instances/Animation";
import { Model } from "../instances/Model";
import { makePart } from "../instances/Part";
import { RemoteEvent } from "../instances/RemoteEvent";
import { ModuleScript, Script } from "../instances/Script";
import { createDefaultTool } from "../instances/Tool";
import { Workspace } from "../instances/Workspace";

/** Lean starter place for HedronX (not the full play demo). */
export function createStudioPlace(): Workspace {
  const workspace = new Workspace();

  workspace.addPart(
    makePart("Baseplate", 0, -0.5, 0, 100, 1, 100, 0x5f9a52, {
      material: "Plastic",
    }),
  );

  workspace.addPart(
    makePart("Spawn", 0, 0.5, 0, 4, 1, 4, 0x3d7eff, {
      material: "SmoothPlastic",
    }),
  );

  // Instant-death volume (name match Kill/Lava/Damage in Play)
  workspace.addPart(
    makePart("KillBrick", 12, 0.5, -12, 8, 1, 8, 0xc62828, {
      material: "Neon",
    }),
  );

  // Unanchored physics crate
  const crate = makePart("Crate", -8, 2, 4, 3, 3, 3, 0xc4a35a, {
    material: "Wood",
    anchored: false,
  });
  workspace.addPart(crate);

  const props = new Model("Props");
  props.setParent(workspace);

  workspace.addPart(
    makePart("Block", 8, 2, -4, 4, 4, 4, 0xc4c4c4, {
      material: "ReinforcedMetal",
    }),
    props,
  );

  workspace.addPart(
    makePart("Platform", -10, 3, 6, 12, 1, 8, 0xb07d4a, {
      material: "WoodPlanks",
    }),
    props,
  );

  workspace.addPart(
    makePart("GlassPane", 4, 3, 8, 6, 4, 0.4, 0xa8d8ff, {
      material: "Glass",
    }),
    props,
  );

  workspace.addPart(
    makePart("IceBlock", -6, 1.5, -8, 5, 3, 5, 0xc8f0ff, {
      material: "Ice",
    }),
    props,
  );

  const shapes = new Model("Shapes");
  shapes.setParent(workspace);
  workspace.addPart(
    makePart("Ball", -14, 2, 0, 4, 4, 4, 0xff8a65, {
      material: "SmoothPlastic",
      shape: "Ball",
    }),
    shapes,
  );
  workspace.addPart(
    makePart("Cylinder", -14, 2, 6, 3, 5, 3, 0x81d4fa, {
      material: "Metal",
      shape: "Cylinder",
    }),
    shapes,
  );
  workspace.addPart(
    makePart("Wedge", -14, 1.5, 12, 6, 3, 4, 0xce93d8, {
      material: "Plastic",
      shape: "Wedge",
    }),
    shapes,
  );
  workspace.addPart(
    makePart("CornerWedge", -20, 1.5, 12, 5, 3, 5, 0xfff176, {
      material: "Wood",
      shape: "CornerWedge",
    }),
    shapes,
  );

  const originals = new Model("PolyX Mats");
  originals.setParent(workspace);

  workspace.addPart(
    makePart("PolyShellDemo", 14, 2, 4, 4, 4, 4, 0x8ab4f8, {
      material: "PolyShell",
    }),
    originals,
  );
  workspace.addPart(
    makePart("HedronDemo", 20, 2, 4, 4, 4, 4, 0xc5d0e6, {
      material: "HedronAlloy",
    }),
    originals,
  );
  workspace.addPart(
    makePart("TraceDemo", 14, 1.5, 10, 6, 3, 1, 0x2dff8a, {
      material: "TraceMesh",
    }),
    originals,
  );
  workspace.addPart(
    makePart("HoloDemo", 20, 2, 10, 4, 4, 0.3, 0xffffff, {
      material: "HoloFilm",
    }),
    originals,
  );
  workspace.addPart(
    makePart("GlowDemo", 17, 1.5, 16, 5, 3, 5, 0x66ffcc, {
      material: "GlowGel",
    }),
    originals,
  );

  const scripts = new Model("Scripts");
  scripts.setParent(workspace);

  const util = new ModuleScript(
    "Util",
    `// ModuleScript — require("Util") from a Script
export function double(x: number) {
  return x * 2;
}

export function area(w: number, h: number) {
  return py(\`\${w} * \${h}\`);
}
`,
  );
  util.setParent(scripts);

  const hello = new Script(
    "Hello",
    `// Script — runs when you hit Play
print("Hello from", script.name);

const n = py("2 ** 8 + 3");
print("py calc:", n);

const util = require("Util") as {
  double: (x: number) => number;
  area: (w: number, h: number) => number;
};
print("double(21) =", util.double(21));
print("area(4, 5) =", util.area(4, 5));

// Players / Humanoid / DataStore
const player = game.Players.LocalPlayer;
print("LocalPlayer", player.Name, player.UserId);
if (Humanoid) {
  Humanoid.HealthChanged.Connect((h: number) => print("HP:", h));
}

const store = game.GetService("DataStoreService").GetDataStore("Demo");
const visits = ((await store.GetAsync("visits")) as number) ?? 0;
await store.SetAsync("visits", visits + 1);
print("Visits (local DataStore):", visits + 1);

// Touched example on KillBrick is built into Play; raycast demo:
const hit = workspace.Raycast(
  { x: 0, y: 10, z: 0 },
  { x: 0, y: -1, z: 0 },
  50,
);
if (hit) print("Ray hit", hit.Instance.name, "at", hit.Distance);
`,
  );
  hello.setParent(scripts);

  const remotes = new Model("Remotes");
  remotes.setParent(workspace);
  new RemoteEvent("Ping").setParent(remotes);

  const hammer = createDefaultTool("Hammer");
  for (const p of hammer.getParts()) {
    p.position.x += 6;
    p.position.z -= 10;
    p.sync();
    workspace.parts.push(p);
    workspace.root.add(p.mesh);
  }
  hammer.setParent(workspace);

  const toolScript = new Script(
    "HammerScript",
    `// Tool script — tool is injected when parented under a Tool
if (tool) {
  tool.Equipped(() => print("Hammer equipped"));
  tool.Activated(() => print("Hammer swing!", py("2 + 2")));
}
`,
  );
  toolScript.setParent(hammer);

  const gui = createDefaultScreenGui("HUD");
  gui.setParent(workspace);
  const guiScript = new Script(
    "HudScript",
    `const panel = script.parent?.findFirstChild("Panel");
const action = panel?.findFirstChild("Action") as {
  Activated: (fn: () => void) => void;
} | undefined;

if (action) {
  action.Activated(() => print("GUI button clicked"));
}
`,
  );
  guiScript.setParent(gui);

  const wave = createWaveAnimation("WaveAnim");
  wave.setParent(workspace);
  const cheer = createCheerAnimation("CheerAnim");
  cheer.setParent(workspace);

  const vf = createDefaultViewportFrame("RigView");
  vf.showTestRig = true;
  vf.animationName = "WaveAnim";
  vf.objectName = "Ball";
  vf.anchorX = 0.74;
  vf.anchorY = 0.08;
  vf.sizeX = 0.24;
  vf.sizeY = 0.34;
  vf.setParent(gui);

  const partView = createDefaultViewportFrame("PartView");
  partView.showTestRig = false;
  partView.animationName = "";
  partView.objectName = "Block";
  partView.anchorX = 0.74;
  partView.anchorY = 0.46;
  partView.sizeX = 0.24;
  partView.sizeY = 0.22;
  partView.cameraDistance = 9;
  partView.setParent(gui);

  return workspace;
}

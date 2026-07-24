import { GridHelper, type Scene } from "three";
import { makeRamp } from "../instances/Ramp";
import { makePart, type Part } from "../instances/Part";
import { Workspace } from "../instances/Workspace";

/** Baseplate size (studs). */
const MAP = 200;

export interface DemoWorld {
  workspace: Workspace;
  ground: Part;
  wall: Part;
}

/**
 * Build a staircase from Parts (+Z direction).
 * Each step is a solid block from the ground up (classic Roblox style).
 */
export function buildStairs(
  workspace: Workspace,
  originX: number,
  originZ: number,
  steps: number,
  stepH: number,
  stepD: number,
  width: number,
  color: number,
  namePrefix = "Stair",
) {
  const parts: Part[] = [];
  for (let i = 0; i < steps; i++) {
    const h = stepH * (i + 1);
    const z = originZ + stepD * (i + 0.5);
    const p = makePart(
      `${namePrefix}_${i}`,
      originX,
      h * 0.5,
      z,
      width,
      h,
      stepD,
      color,
    );
    workspace.addPart(p);
    parts.push(p);
  }
  return parts;
}

/**
 * Flat step platforms (good for step-up testing) — each tread is a thin slab.
 */
export function buildStepPlatforms(
  workspace: Workspace,
  originX: number,
  originZ: number,
  steps: number,
  stepH: number,
  stepD: number,
  width: number,
  color: number,
  namePrefix = "Step",
) {
  const parts: Part[] = [];
  for (let i = 0; i < steps; i++) {
    const topY = stepH * (i + 1);
    const z = originZ + stepD * (i + 0.5);
    const thickness = Math.min(0.5, stepH * 0.45);
    const p = makePart(
      `${namePrefix}_${i}`,
      originX,
      topY - thickness * 0.5,
      z,
      width,
      thickness,
      stepD,
      color,
    );
    workspace.addPart(p);
    parts.push(p);
  }
  return parts;
}

export function createDemoWorld(scene: Scene): DemoWorld {
  const workspace = new Workspace();
  workspace.mount(scene);

  const ground = makePart(
    "Baseplate",
    0,
    -0.5,
    0,
    MAP,
    1,
    MAP,
    0x5f9a52,
    { material: "Plastic" },
  );
  workspace.addPart(ground);

  // —— Near spawn ——
  const wall = makePart("Wall", 0, 6, -36, 48, 12, 2, 0xc4b49a);
  workspace.addPart(wall);
  workspace.addPart(makePart("Pillar", -14, 3, -6, 3, 6, 3, 0x8b7355));
  workspace.addPart(makePart("Platform", 14, 1.5, -10, 8, 3, 8, 0x6e8b9a));
  workspace.addPart(makePart("Ledge", 0, 0.75, 12, 8, 1.5, 5, 0x9a8b6e));

  // —— Step-up course (near spawn, +X): 1-stud treads you can walk up ——
  buildStepPlatforms(workspace, 8, 2, 6, 1, 2.2, 5, 0xd4a017, "StepUp");
  workspace.addPart(
    makePart("StepUp_Landing", 8, 6.25, 2 + 6 * 2.2 + 2, 7, 0.5, 6, 0xc4920f),
  );

  // —— East: solid stairs + landing ——
  buildStairs(workspace, 28, 4, 8, 0.9, 2.2, 6, 0xb08968, "EastStair");
  workspace.addPart(
    makePart("EastLanding", 28, 3.85, 4 + 8 * 2.2 + 3, 10, 0.7, 8, 0xa07850),
  );
  workspace.addPart(makePart("Tower", 38, 5, 10, 5, 10, 5, 0x7a6a55));

  // —— West: coyote / gap park ——
  workspace.addPart(makePart("GapPad_A", -24, 1, 8, 6, 2, 6, 0x6d8f71));
  workspace.addPart(makePart("GapPad_B", -24, 1.5, 18, 5, 3, 5, 0x5f7f64));
  workspace.addPart(makePart("GapPad_C", -24, 2.5, 28, 6, 5, 6, 0x54725a));
  workspace.addPart(makePart("GapPad_Side", -32, 1.25, 14, 4, 2.5, 4, 0x8a9e6e));

  // —— North: corridor ——
  workspace.addPart(makePart("Corridor_L", -5, 4, -55, 2, 8, 28, 0x9a8f7e));
  workspace.addPart(makePart("Corridor_R", 5, 4, -55, 2, 8, 28, 0x9a8f7e));
  workspace.addPart(makePart("Corridor_Roof", 0, 8.5, -55, 12, 1, 28, 0x8a8070));
  workspace.addPart(makePart("Corridor_End", 0, 3, -70, 14, 6, 2, 0x7d7264));

  // —— Northeast: crates + overhang ——
  workspace.addPart(makePart("Crate_1", 18, 1, 22, 4, 2, 4, 0xc4a574));
  workspace.addPart(makePart("Crate_2", 18, 3, 22, 3, 2, 3, 0xb8955f));
  workspace.addPart(makePart("Crate_3", 18, 4.75, 22, 2.5, 1.5, 2.5, 0xa8844f));
  workspace.addPart(makePart("Overhang", 26, 4, 22, 8, 1, 6, 0x8b7355));
  workspace.addPart(makePart("Overhang_Post", 29, 2, 22, 2, 4, 6, 0x7a6348));

  // —— Southeast: terrace ——
  workspace.addPart(makePart("Terrace_A", 20, 2, -22, 15.8, 4, 4, 0x6e8b9a));
  workspace.addPart(makePart("Terrace_B", 30.1, 3.5, -28, 4, 7, 12, 0x5d7a88));
  workspace.addPart(makePart("Terrace_C", 20, 5, -34, 15.8, 1.5, 4, 0x6e8b9a));

  // —— Southwest: bridge ——
  workspace.addPart(makePart("Bridge_Pier_A", -18, 2, -20, 3, 4, 3, 0x8b6914));
  workspace.addPart(makePart("Bridge_Pier_B", -18, 2, -32, 3, 4, 3, 0x8b6914));
  workspace.addPart(makePart("Bridge_Deck", -18, 4.25, -26, 2.2, 0.5, 14, 0xa67c3d));

  // —— Spawn bump blocks ——
  workspace.addPart(makePart("Block_A", 5, 0.5, 3, 2, 1, 2, 0xa09070));
  workspace.addPart(makePart("Block_B", -4, 1, -3, 2.5, 2, 2.5, 0x908060));
  workspace.addPart(makePart("Block_C", 8, 0.75, -4, 3, 1.5, 1.5, 0xb0a080));

  // —— Ramps / slopes (near spawn, toward −X) ——
  // Gentle ~20°
  makeRamp(workspace, "Ramp_Gentle", 4, 0, -8, 8, 14, 5, Math.PI, 0xc2a66a);
  workspace.addPart(makePart("Ramp_Gentle_Top", 4, 5.25, -8 - 14 - 3, 10, 0.5, 8, 0xb8955f));
  // Medium ~35°
  makeRamp(
    workspace,
    "Ramp_Medium",
    -10,
    0,
    10,
    7,
    12,
    8,
    -Math.PI * 0.5,
    0xa67c52,
  );
  // Steeper ~45° still walkable
  makeRamp(
    workspace,
    "Ramp_Steep",
    12,
    0,
    8,
    6,
    10,
    9,
    Math.PI * 0.25,
    0x8b6914,
  );
  // Wide slope up to a deck
  makeRamp(workspace, "Ramp_Deck", -6, 0, -14, 12, 16, 6, Math.PI * 0.85, 0x7d8f6e);
  workspace.addPart(
    makePart("SlopeDeck", -6 + Math.sin(Math.PI * 0.85) * 16, 6.25, -14 + Math.cos(Math.PI * 0.85) * 16, 14, 0.5, 10, 0x6b7c5e),
  );

  // —— Far west: plateau + stairs ——
  workspace.addPart(makePart("Plateau", -45, 4, 0, 14, 8, 14, 0x6b7c5e));
  buildStairs(workspace, -45, 8, 6, 1.1, 2.5, 5, 0x7d8f6e, "WestStair");

  // —— South stairs climbing toward −Z (from z=−6 toward −20) ——
  for (let i = 0; i < 8; i++) {
    const stepH = 0.85;
    const stepD = 2.1;
    const h = stepH * (i + 1);
    const z = -6 - stepD * (i + 0.5);
    workspace.addPart(
      makePart(`SouthStair_${i}`, -8, h * 0.5, z, 5, h, stepD, 0x8f7a5c),
    );
  }
  workspace.addPart(makePart("SouthLanding", -8, 3.6, -6 - 8 * 2.1 - 2.5, 7, 0.6, 6, 0x7a6850));

  const grid = new GridHelper(MAP, MAP, 0xffffff, 0xffffff);
  grid.position.y = 0.02;
  const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const m of gridMats) {
    m.opacity = 0.12;
    m.transparent = true;
  }
  scene.add(grid);

  return { workspace, ground, wall };
}

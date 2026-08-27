import {
  CanvasTexture,
  type MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

/**
 * Studio Part materials.
 * Classic set + PolyX / HedronX originals.
 * Ice is visual only — does not change friction by itself.
 */
export const PART_MATERIALS = [
  // Classic
  "Plastic",
  "SmoothPlastic",
  "Metal",
  "ReinforcedMetal",
  "Foil",
  "CorrodedMetal",
  "Wood",
  "WoodPlanks",
  "Glass",
  "Ice",
  "Concrete",
  "Brick",
  "Slate",
  "Granite",
  "Marble",
  "Sand",
  "Grass",
  "Fabric",
  "Neon",
  // PolyX / HedronX originals
  "PolyShell",
  "HedronAlloy",
  "StudMatte",
  "CarbonWeave",
  "Honeycomb",
  "TraceMesh",
  "Obsidian",
  "Emberstone",
  "Cardboard",
  "Rubber",
  "Porcelain",
  "HoloFilm",
  "VoidMatte",
  "GlowGel",
] as const;

export type PartMaterial = (typeof PART_MATERIALS)[number];

/** Materials unique to PolyX / HedronX (for UI grouping). */
export const POLYX_MATERIALS: readonly PartMaterial[] = [
  "PolyShell",
  "HedronAlloy",
  "StudMatte",
  "CarbonWeave",
  "Honeycomb",
  "TraceMesh",
  "Obsidian",
  "Emberstone",
  "Cardboard",
  "Rubber",
  "Porcelain",
  "HoloFilm",
  "VoidMatte",
  "GlowGel",
] as const;

/** Label shown in the Properties dropdown. */
export const PART_MATERIAL_LABELS: Record<PartMaterial, string> = {
  Plastic: "Plastic",
  SmoothPlastic: "Smooth Plastic",
  Metal: "Metal",
  ReinforcedMetal: "Reinforced Metal",
  Foil: "Foil",
  CorrodedMetal: "Corroded Metal",
  Wood: "Wood",
  WoodPlanks: "Wood Planks",
  Glass: "Glass",
  Ice: "Ice",
  Concrete: "Concrete",
  Brick: "Brick",
  Slate: "Slate",
  Granite: "Granite",
  Marble: "Marble",
  Sand: "Sand",
  Grass: "Grass",
  Fabric: "Fabric",
  Neon: "Neon",
  PolyShell: "PolyShell",
  HedronAlloy: "Hedron Alloy",
  StudMatte: "Stud Matte",
  CarbonWeave: "Carbon Weave",
  Honeycomb: "Honeycomb",
  TraceMesh: "Trace Mesh",
  Obsidian: "Obsidian",
  Emberstone: "Emberstone",
  Cardboard: "Cardboard",
  Rubber: "Rubber",
  Porcelain: "Porcelain",
  HoloFilm: "Holo Film",
  VoidMatte: "Void Matte",
  GlowGel: "Glow Gel",
};

interface MaterialLook {
  metalness: number;
  roughness: number;
  /** Extra opacity multiply (1 = opaque). Stacks with Part.transparency. */
  opacity?: number;
  /** Force transparent pass even when opacity is 1 (Glass/Ice). */
  transparent?: boolean;
  emissiveIntensity?: number;
  texture?: () => Texture;
  roughnessMap?: () => Texture;
  /** Studs-ish UV repeat based on part size (applied in sync). */
  texRepeatPerStud?: number;
}

const texCache = new Map<string, Texture>();

function canvasTex(
  key: string,
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
): Texture {
  const hit = texCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  paint(ctx, size);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function woodPlanksTex() {
  return canvasTex("woodPlanks", 128, (ctx, s) => {
    ctx.fillStyle = "#c4a574";
    ctx.fillRect(0, 0, s, s);
    const plankH = s / 4;
    for (let i = 0; i < 4; i++) {
      const y = i * plankH;
      const shade = 180 + ((i * 17) % 40);
      ctx.fillStyle = `rgb(${shade}, ${shade - 40}, ${shade - 90})`;
      ctx.fillRect(0, y + 1, s, plankH - 2);
      ctx.strokeStyle = "rgba(60,35,15,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y + plankH);
      ctx.lineTo(s, y + plankH);
      ctx.stroke();
      // grain
      ctx.strokeStyle = "rgba(80,45,20,0.2)";
      ctx.lineWidth = 1;
      for (let g = 0; g < 6; g++) {
        const x = 8 + g * 20 + (i % 2) * 10;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x + 4, y + plankH - 4);
        ctx.stroke();
      }
    }
  });
}

function woodTex() {
  return canvasTex("wood", 128, (ctx, s) => {
    ctx.fillStyle = "#b08958";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(90,50,20,${0.12 + (i % 3) * 0.05})`;
      ctx.lineWidth = 1 + (i % 2);
      ctx.beginPath();
      const x = (i * 11) % s;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 20, s * 0.3, x - 10, s * 0.7, x + 8, s);
      ctx.stroke();
    }
  });
}

/** Diamond plate / Reinforced Metal. */
function reinforcedMetalTex() {
  return canvasTex("reinforcedMetal", 128, (ctx, s) => {
    ctx.fillStyle = "#8a8e96";
    ctx.fillRect(0, 0, s, s);
    const step = 16;
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        const ox = x + ((y / step) % 2 === 0 ? 0 : step * 0.5);
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.ellipse(ox + 4, y + 5, 5, 3, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath();
        ctx.ellipse(ox + 5, y + 7, 5, 3, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function brickTex() {
  return canvasTex("brick", 128, (ctx, s) => {
    ctx.fillStyle = "#6b4a3a";
    ctx.fillRect(0, 0, s, s);
    const bh = 16;
    const bw = 32;
    ctx.strokeStyle = "#cfc6b8";
    ctx.lineWidth = 2;
    for (let row = 0; row < s / bh; row++) {
      const off = row % 2 === 0 ? 0 : bw * 0.5;
      for (let col = -1; col < s / bw + 1; col++) {
        const x = col * bw + off;
        const y = row * bh;
        ctx.fillStyle = row % 3 === 0 ? "#7a5342" : "#654433";
        ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        ctx.strokeRect(x, y, bw, bh);
      }
    }
  });
}

function concreteTex() {
  return canvasTex("concrete", 64, (ctx, s) => {
    ctx.fillStyle = "#9a9a9a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) {
      const g = 120 + Math.floor(Math.random() * 80);
      ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
      ctx.fillRect(
        Math.random() * s,
        Math.random() * s,
        1 + Math.random() * 2,
        1 + Math.random() * 2,
      );
    }
  });
}

function grassTex() {
  return canvasTex("grass", 64, (ctx, s) => {
    ctx.fillStyle = "#4a8f3c";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(30,90,30,${0.25 + Math.random() * 0.4})`;
      ctx.beginPath();
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 4 - Math.random() * 6);
      ctx.stroke();
    }
  });
}

function sandTex() {
  return canvasTex("sand", 64, (ctx, s) => {
    ctx.fillStyle = "#d2c08a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      const g = 180 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgba(${g},${g - 30},${g - 80},0.4)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
  });
}

function fabricTex() {
  return canvasTex("fabric", 64, (ctx, s) => {
    ctx.fillStyle = "#7a6b8a";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < s; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.stroke();
    }
  });
}

function marbleTex() {
  return canvasTex("marble", 128, (ctx, s) => {
    ctx.fillStyle = "#e8e6e1";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(120,120,130,${0.15 + (i % 3) * 0.08})`;
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(Math.random() * s, 0);
      ctx.bezierCurveTo(
        Math.random() * s,
        s * 0.33,
        Math.random() * s,
        s * 0.66,
        Math.random() * s,
        s,
      );
      ctx.stroke();
    }
  });
}

function graniteTex() {
  return canvasTex("granite", 64, (ctx, s) => {
    ctx.fillStyle = "#6a6a6e";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i++) {
      const c = 80 + Math.floor(Math.random() * 100);
      ctx.fillStyle = `rgb(${c},${c},${c + 5})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
  });
}

function slateTex() {
  return canvasTex("slate", 64, (ctx, s) => {
    ctx.fillStyle = "#4a5560";
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 6) {
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 2);
      ctx.lineTo(s, y + Math.random() * 2);
      ctx.stroke();
    }
  });
}

function corrodedMetalTex() {
  return canvasTex("corroded", 64, (ctx, s) => {
    ctx.fillStyle = "#6b5a3e";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(${100 + Math.random() * 80},${60 + Math.random() * 40},20,0.5)`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * Crinkled kitchen-foil look: bright silver base + soft fold streaks.
 * (Pure mirror metalness looks black/odd with no HDRI env map.)
 */
function foilTex() {
  return canvasTex("foil", 256, (ctx, s) => {
    // Bright aluminum base so lights + tint still read
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#f4f5f7");
    g.addColorStop(0.35, "#d8dce2");
    g.addColorStop(0.55, "#f7f8fa");
    g.addColorStop(0.8, "#c5cad1");
    g.addColorStop(1, "#eef0f3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);

    // Soft fold bands (anisotropic-ish streaks)
    for (let i = 0; i < 28; i++) {
      const x0 = Math.random() * s;
      const y0 = Math.random() * s;
      const len = 40 + Math.random() * 120;
      const ang = Math.random() * Math.PI;
      const bright = Math.random() > 0.45;
      ctx.strokeStyle = bright
        ? `rgba(255,255,255,${0.25 + Math.random() * 0.35})`
        : `rgba(90,95,105,${0.12 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(
        x0 + Math.cos(ang) * len * 0.5 + (Math.random() - 0.5) * 20,
        y0 + Math.sin(ang) * len * 0.5 + (Math.random() - 0.5) * 20,
        x0 + Math.cos(ang) * len,
        y0 + Math.sin(ang) * len,
      );
      ctx.stroke();
    }

    // Fine sparkle / micro facets
    for (let i = 0; i < 180; i++) {
      const v = 160 + Math.floor(Math.random() * 95);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},${0.15 + Math.random() * 0.25})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1 + Math.random() * 2);
    }
  });
}

/** Roughness map: brighter = rougher wrinkles in the folds. */
function foilRoughnessTex() {
  return canvasTex("foilRough", 256, (ctx, s) => {
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const x0 = Math.random() * s;
      const y0 = Math.random() * s;
      const len = 30 + Math.random() * 100;
      const ang = Math.random() * Math.PI;
      ctx.strokeStyle = Math.random() > 0.5 ? "#b0b0b0" : "#3a3a3a";
      ctx.lineWidth = 2 + Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
      ctx.stroke();
    }
  });
}

/** Faceted polyhedral shell — PolyX signature. */
function polyShellTex() {
  return canvasTex("polyShell", 256, (ctx, s) => {
    ctx.fillStyle = "#9aa3b0";
    ctx.fillRect(0, 0, s, s);
    const tris = [
      [0, 0, s, 0, s * 0.5, s * 0.45],
      [0, 0, s * 0.5, s * 0.45, 0, s],
      [s, 0, s, s, s * 0.5, s * 0.45],
      [0, s, s * 0.5, s * 0.45, s, s],
      [s * 0.2, s * 0.2, s * 0.8, s * 0.2, s * 0.5, s * 0.55],
      [s * 0.15, s * 0.7, s * 0.85, s * 0.7, s * 0.5, s * 0.35],
    ];
    for (let i = 0; i < tris.length; i++) {
      const [x0, y0, x1, y1, x2, y2] = tris[i];
      const v = 130 + (i % 5) * 18;
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(20,24,32,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

/** Crystalline hex alloy — HedronX signature. */
function hedronAlloyTex() {
  return canvasTex("hedronAlloy", 256, (ctx, s) => {
    ctx.fillStyle = "#5a6578";
    ctx.fillRect(0, 0, s, s);
    const R = 18;
    for (let row = -1; row < s / (R * 1.5) + 1; row++) {
      for (let col = -1; col < s / (R * 1.75) + 1; col++) {
        const cx = col * R * 1.75 + (row % 2) * R * 0.875;
        const cy = row * R * 1.5;
        const bright = (row + col) % 3 === 0;
        ctx.fillStyle = bright ? "#a8b4c8" : "#6e7a90";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const x = cx + Math.cos(a) * R;
          const y = cy + Math.sin(a) * R;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(220,230,255,0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
}

/** Soft matte studs. */
function studMatteTex() {
  return canvasTex("studMatte", 128, (ctx, s) => {
    ctx.fillStyle = "#b8b8b8";
    ctx.fillRect(0, 0, s, s);
    const step = 32;
    for (let y = step / 2; y < s; y += step) {
      for (let x = step / 2; x < s; x += step) {
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.arc(x + 1, y + 1, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c4c4c4";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function carbonWeaveTex() {
  return canvasTex("carbonWeave", 128, (ctx, s) => {
    ctx.fillStyle = "#1a1a1c";
    ctx.fillRect(0, 0, s, s);
    const step = 8;
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        const dark = (x / step + y / step) % 2 === 0;
        ctx.fillStyle = dark ? "#222226" : "#2e2e34";
        ctx.fillRect(x, y, step, step);
        ctx.strokeStyle = "rgba(80,80,90,0.35)";
        ctx.strokeRect(x, y, step, step);
      }
    }
    // diagonal twill
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let i = -s; i < s * 2; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
  });
}

function honeycombTex() {
  return canvasTex("honeycomb", 256, (ctx, s) => {
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(0, 0, s, s);
    const R = 14;
    for (let row = -1; row < s / (R * 1.5) + 1; row++) {
      for (let col = -1; col < s / (R * 1.75) + 1; col++) {
        const cx = col * R * 1.75 + (row % 2) * R * 0.875;
        const cy = row * R * 1.5;
        ctx.fillStyle = (row + col) % 2 === 0 ? "#e0b93a" : "#b89020";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const x = cx + Math.cos(a) * R;
          const y = cy + Math.sin(a) * R;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(60,40,10,0.45)";
        ctx.stroke();
      }
    }
  });
}

function traceMeshTex() {
  return canvasTex("traceMesh", 256, (ctx, s) => {
    ctx.fillStyle = "#1a3d2e";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#3ecf7a";
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const y = 12 + i * 14;
      ctx.beginPath();
      ctx.moveTo(0, y);
      let x = 0;
      while (x < s) {
        const nx = x + 20 + Math.random() * 30;
        const ny = y + (Math.random() > 0.5 ? 10 : -10);
        ctx.lineTo(Math.min(nx, s), Math.max(8, Math.min(s - 8, ny)));
        x = nx;
      }
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "#8cffb0";
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function obsidianTex() {
  return canvasTex("obsidian", 128, (ctx, s) => {
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(120,140,180,${0.08 + (i % 3) * 0.04})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * s, 0);
      ctx.bezierCurveTo(
        Math.random() * s,
        s * 0.3,
        Math.random() * s,
        s * 0.7,
        Math.random() * s,
        s,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "rgba(200,210,230,0.12)";
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 2);
    }
  });
}

function emberstoneTex() {
  return canvasTex("emberstone", 128, (ctx, s) => {
    ctx.fillStyle = "#1a1210";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      const hot = Math.random();
      ctx.strokeStyle =
        hot > 0.7
          ? `rgba(255,${120 + Math.floor(Math.random() * 80)},40,0.7)`
          : `rgba(180,40,20,0.35)`;
      ctx.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
      ctx.stroke();
    }
  });
}

function cardboardTex() {
  return canvasTex("cardboard", 128, (ctx, s) => {
    ctx.fillStyle = "#c4a574";
    ctx.fillRect(0, 0, s, s);
    // corrugation
    for (let x = 0; x < s; x += 6) {
      ctx.strokeStyle = "rgba(90,60,30,0.25)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < s; y += 4) {
        ctx.lineTo(x + Math.sin(y * 0.4) * 2, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,240,200,0.15)";
    ctx.fillRect(0, 0, s, s * 0.5);
  });
}

function holoFilmTex() {
  return canvasTex("holoFilm", 256, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#ff6ad5");
    g.addColorStop(0.25, "#6ad5ff");
    g.addColorStop(0.5, "#b8ff6a");
    g.addColorStop(0.75, "#ffd56a");
    g.addColorStop(1, "#c56aff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.25})`;
      ctx.lineWidth = 1;
      const y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + (Math.random() - 0.5) * 20);
      ctx.stroke();
    }
  });
}

const LOOKS: Record<PartMaterial, MaterialLook> = {
  Plastic: { metalness: 0.05, roughness: 0.85 },
  SmoothPlastic: { metalness: 0, roughness: 0.45 },
  Metal: { metalness: 0.75, roughness: 0.35 },
  ReinforcedMetal: {
    metalness: 0.85,
    roughness: 0.4,
    texture: reinforcedMetalTex,
    texRepeatPerStud: 0.35,
  },
  Foil: {
    metalness: 0.92,
    roughness: 0.28,
    texture: foilTex,
    roughnessMap: foilRoughnessTex,
    texRepeatPerStud: 0.45,
  },
  CorrodedMetal: {
    metalness: 0.55,
    roughness: 0.75,
    texture: corrodedMetalTex,
    texRepeatPerStud: 0.4,
  },
  Wood: {
    metalness: 0,
    roughness: 0.85,
    texture: woodTex,
    texRepeatPerStud: 0.25,
  },
  WoodPlanks: {
    metalness: 0,
    roughness: 0.9,
    texture: woodPlanksTex,
    texRepeatPerStud: 0.2,
  },
  Glass: {
    metalness: 0,
    roughness: 0.05,
    opacity: 0.35,
    transparent: true,
  },
  Ice: {
    metalness: 0.05,
    roughness: 0.15,
    opacity: 0.55,
    transparent: true,
  },
  Concrete: {
    metalness: 0,
    roughness: 0.95,
    texture: concreteTex,
    texRepeatPerStud: 0.3,
  },
  Brick: {
    metalness: 0,
    roughness: 0.9,
    texture: brickTex,
    texRepeatPerStud: 0.25,
  },
  Slate: {
    metalness: 0,
    roughness: 0.8,
    texture: slateTex,
    texRepeatPerStud: 0.3,
  },
  Granite: {
    metalness: 0,
    roughness: 0.7,
    texture: graniteTex,
    texRepeatPerStud: 0.35,
  },
  Marble: {
    metalness: 0,
    roughness: 0.25,
    texture: marbleTex,
    texRepeatPerStud: 0.2,
  },
  Sand: {
    metalness: 0,
    roughness: 1,
    texture: sandTex,
    texRepeatPerStud: 0.4,
  },
  Grass: {
    metalness: 0,
    roughness: 0.95,
    texture: grassTex,
    texRepeatPerStud: 0.35,
  },
  Fabric: {
    metalness: 0,
    roughness: 0.9,
    texture: fabricTex,
    texRepeatPerStud: 0.5,
  },
  Neon: {
    metalness: 0,
    roughness: 0.4,
    emissiveIntensity: 1.1,
  },
  // —— PolyX / HedronX originals ——
  PolyShell: {
    metalness: 0.15,
    roughness: 0.55,
    texture: polyShellTex,
    texRepeatPerStud: 0.2,
  },
  HedronAlloy: {
    metalness: 0.8,
    roughness: 0.3,
    texture: hedronAlloyTex,
    texRepeatPerStud: 0.28,
  },
  StudMatte: {
    metalness: 0,
    roughness: 0.88,
    texture: studMatteTex,
    texRepeatPerStud: 0.35,
  },
  CarbonWeave: {
    metalness: 0.25,
    roughness: 0.55,
    texture: carbonWeaveTex,
    texRepeatPerStud: 0.5,
  },
  Honeycomb: {
    metalness: 0.05,
    roughness: 0.7,
    texture: honeycombTex,
    texRepeatPerStud: 0.3,
  },
  TraceMesh: {
    metalness: 0.2,
    roughness: 0.45,
    texture: traceMeshTex,
    texRepeatPerStud: 0.25,
  },
  Obsidian: {
    metalness: 0.35,
    roughness: 0.12,
    texture: obsidianTex,
    texRepeatPerStud: 0.2,
  },
  Emberstone: {
    metalness: 0.1,
    roughness: 0.75,
    texture: emberstoneTex,
    texRepeatPerStud: 0.3,
    emissiveIntensity: 0.35,
  },
  Cardboard: {
    metalness: 0,
    roughness: 0.95,
    texture: cardboardTex,
    texRepeatPerStud: 0.35,
  },
  Rubber: {
    metalness: 0,
    roughness: 0.98,
  },
  Porcelain: {
    metalness: 0,
    roughness: 0.18,
  },
  HoloFilm: {
    metalness: 0.55,
    roughness: 0.2,
    texture: holoFilmTex,
    texRepeatPerStud: 0.4,
  },
  VoidMatte: {
    metalness: 0,
    roughness: 1,
  },
  GlowGel: {
    metalness: 0,
    roughness: 0.35,
    opacity: 0.65,
    transparent: true,
    emissiveIntensity: 0.85,
  },
};

/**
 * Apply a PartMaterial look onto a MeshStandardMaterial.
 * `size` is Part.size for texture repeat; `transparency` is Part.transparency 0–1.
 */
export function applyPartMaterial(
  mat: MeshStandardMaterial,
  material: PartMaterial,
  opts: { sizeX: number; sizeY: number; sizeZ: number; transparency: number },
) {
  const look = LOOKS[material] ?? LOOKS.Plastic;
  mat.metalness = look.metalness;
  mat.roughness = look.roughness;

  const baseOpacity = look.opacity ?? 1;
  const opacity = Math.max(0, Math.min(1, baseOpacity * (1 - opts.transparency)));
  mat.opacity = opacity;
  mat.transparent = !!look.transparent || opacity < 0.999;
  mat.depthWrite = opacity > 0.9;

  if (look.emissiveIntensity && look.emissiveIntensity > 0) {
    mat.emissive.copy(mat.color);
    mat.emissiveIntensity = look.emissiveIntensity;
  } else {
    mat.emissive.set(0x000000);
    mat.emissiveIntensity = 0;
  }

  if (look.texture) {
    const tex = look.texture();
    const rep = look.texRepeatPerStud ?? 0.25;
    const avg = (opts.sizeX + opts.sizeY + opts.sizeZ) / 3;
    const u = Math.max(1, avg * rep);
    tex.repeat.set(u, u);
    tex.needsUpdate = true;
    mat.map = tex;
  } else {
    mat.map = null;
  }

  if (look.roughnessMap) {
    const rtex = look.roughnessMap();
    const rep = look.texRepeatPerStud ?? 0.25;
    const avg = (opts.sizeX + opts.sizeY + opts.sizeZ) / 3;
    const u = Math.max(1, avg * rep);
    rtex.repeat.set(u, u);
    rtex.needsUpdate = true;
    mat.roughnessMap = rtex;
  } else {
    mat.roughnessMap = null;
  }

  mat.needsUpdate = true;
}

/** Tint: textured materials multiply Part.color onto the map via material.color. */
export function tintPartMaterial(
  mat: MeshStandardMaterial,
  material: PartMaterial,
  partColor: { r: number; g: number; b: number },
) {
  if (material === "VoidMatte") {
    // Crush albedo toward black — light sink
    mat.color.setRGB(
      partColor.r * 0.08,
      partColor.g * 0.08,
      partColor.b * 0.08,
    );
  } else {
    mat.color.setRGB(partColor.r, partColor.g, partColor.b);
  }
  const look = LOOKS[material] ?? LOOKS.Plastic;
  if (look.emissiveIntensity && look.emissiveIntensity > 0) {
    mat.emissive.copy(mat.color);
  }
}

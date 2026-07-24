import { CanvasTexture, SRGBColorSpace, Texture } from "three";

/**
 * Selectable face textures for characters.
 * Editor can list these, show thumbnails, and call register() for custom faces later.
 */
export interface FaceTextureAsset {
  /** Stable id used by characters / saves / editor selection. */
  id: string;
  /** Display name for the future editor UI. */
  name: string;
  description?: string;
  /** Builds (or returns cached) GPU texture. */
  createTexture: () => Texture;
}

const registry = new Map<string, FaceTextureAsset>();
const textureCache = new Map<string, Texture>();

function cacheTexture(id: string, factory: () => Texture): Texture {
  let tex = textureCache.get(id);
  if (!tex) {
    tex = factory();
    textureCache.set(id, tex);
  }
  return tex;
}

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Classic Roblox-style :) */
const classicSmile: FaceTextureAsset = {
  id: "classic-smile",
  name: "Classic Smile",
  description: "Simple :) face — eyes and smile.",
  createTexture: () =>
    cacheTexture("classic-smile-v2", () =>
      makeCanvasTexture((ctx, size) => {
        // Fill the texture — no empty margin around the face
        ctx.fillStyle = "#1a1a1a";
        const eyeY = size * 0.32;
        const eyeR = size * 0.08;
        ctx.beginPath();
        ctx.arc(size * 0.28, eyeY, eyeR, 0, Math.PI * 2);
        ctx.arc(size * 0.72, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = size * 0.065;
        ctx.lineCap = "round";
        ctx.beginPath();
        // Lower + shorter smile
        ctx.arc(
          size / 2,
          size * 0.58,
          size * 0.2,
          0.2 * Math.PI,
          0.8 * Math.PI,
        );
        ctx.stroke();
      }),
    ),
};

/** Empty face (no features) — useful as editor “none”. */
const blank: FaceTextureAsset = {
  id: "blank",
  name: "Blank",
  description: "No face features.",
  createTexture: () =>
    cacheTexture("blank", () => makeCanvasTexture(() => {})),
};

function registerBuiltin(asset: FaceTextureAsset) {
  registry.set(asset.id, asset);
}

registerBuiltin(classicSmile);
registerBuiltin(blank);

export const DEFAULT_FACE_TEXTURE_ID = classicSmile.id;

/**
 * Face texture catalog — editor hooks:
 * - listFaceTextures() for picker UI
 * - getFaceTexture(id) for apply
 * - registerFaceTexture() for user-uploaded / custom faces later
 */
export function listFaceTextures(): FaceTextureAsset[] {
  return [...registry.values()];
}

export function getFaceTexture(id: string): FaceTextureAsset | undefined {
  return registry.get(id);
}

export function registerFaceTexture(asset: FaceTextureAsset): void {
  registry.set(asset.id, asset);
  textureCache.delete(asset.id);
}

export function resolveFaceTexture(id: string): Texture {
  const asset = registry.get(id) ?? classicSmile;
  return asset.createTexture();
}

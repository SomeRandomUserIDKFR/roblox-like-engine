# AGENTS.md

## Cursor Cloud specific instructions

This repo is **PolyX** (engine) by **HedronX** (studio): a Roblox-like 3D client
built with Vite + TypeScript + Three.js. There is no backend server (the
"Renderer: WebGL2/WebGPU" text in the HUD refers to the graphics backend, not a
network service).

### Commands (see `package.json` scripts)
- Dev server: `npm run dev` (Vite on port `5173`; `vite.config.ts` has `open: true`, which
  is harmless/no-op in a headless VM). To reach it from outside localhost use
  `npm run dev -- --host 0.0.0.0`.
- Typecheck/"lint": `npx tsc --noEmit` (there is no ESLint config; `tsc` with `strict`,
  `noUnusedLocals`, `noUnusedParameters` is the type/lint gate).
- Build: `npm run build` (`tsc && vite build`).
- Preview built output: `npm run preview`.

### Non-obvious gotchas
- Renderer: `src/render/createRenderer.ts` uses `three/webgpu` `WebGPURenderer`, which
  automatically falls back to WebGL2 when WebGPU is unavailable. In cloud VMs there is no
  GPU, so it runs on WebGL2 via software rendering.
- Headless Chrome needs software-GL flags or the canvas stays black with
  `Cannot read properties of null (reading 'getSupportedExtensions')`. Launch Chrome/Chromium
  with: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`
  (also `--ignore-gpu-blocklist`). With these flags the scene renders and the HUD shows
  `Renderer: WebGL2`.
- Input is captured on `window` keydown/keyup by `e.code` (`src/input/Input.ts`); WASD moves,
  Space jumps, digits 0–9 select the hotbar, LMB slashes with the sword. GUI screen-automation
  tools often fail to deliver *held* keydowns to the page, making the character look stationary.
  For reliable automated verification of movement, drive the page with a real headless browser
  (e.g. Playwright `page.keyboard.down('KeyW')`), which sends trusted key events that the app
  receives correctly.

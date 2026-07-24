import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
} from "three";
import { WebGPURenderer } from "three/webgpu";

export async function createRenderer() {
  const renderer = new WebGPURenderer({ antialias: true });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = SRGBColorSpace;
  document.body.prepend(renderer.domElement);

  const backendEl = document.getElementById("backend");
  if (backendEl) {
    const backend = (renderer.backend as { isWebGPUBackend?: boolean })
      .isWebGPUBackend
      ? "WebGPU"
      : "WebGL2";
    backendEl.textContent = `Renderer: ${backend}`;
  }

  return renderer;
}

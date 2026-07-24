import { DirectionalLight, HemisphereLight, type Scene } from "three";

/** Soft wrap lighting — high fill so shading eases instead of hard bands. */
export function setupLighting(scene: Scene) {
  const hemi = new HemisphereLight(0xcfe6ff, 0x7a9a5c, 1.35);
  scene.add(hemi);

  const sun = new DirectionalLight(0xfff1d6, 1.15);
  sun.position.set(24, 40, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 4;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new DirectionalLight(0xb8d4ff, 0.75);
  fill.position.set(-8, 6, -4);
  scene.add(fill);

  const bounce = new DirectionalLight(0xffe8c8, 0.4);
  bounce.position.set(2, -1, 5);
  scene.add(bounce);

  const rim = new DirectionalLight(0xffe0b0, 0.25);
  rim.position.set(-2, 4, -10);
  scene.add(rim);

  return { sun };
}

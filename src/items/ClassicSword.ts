import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";

/**
 * Classic Roblox-style sword — silver blade, yellow hilt.
 * Origin = grip (handle center).
 * Blade extends along local -Y (out of the palm / along the arm).
 */
export function createClassicSword(): Group {
  const root = new Group();
  root.name = "ClassicSword";

  const bladeMat = new MeshStandardMaterial({
    color: 0xd8dde6,
    metalness: 0.65,
    roughness: 0.35,
  });
  const hiltMat = new MeshStandardMaterial({
    color: 0xf5c518,
    metalness: 0.15,
    roughness: 0.55,
  });
  const pommelMat = new MeshStandardMaterial({
    color: 0xe6b800,
    metalness: 0.25,
    roughness: 0.45,
  });

  // Blade out of the hand (-Y) so identity rotation = along the arm
  const blade = new Mesh(new BoxGeometry(0.12, 2.1, 0.28), bladeMat);
  blade.position.y = -1.4;
  blade.castShadow = true;
  root.add(blade);

  const tip = new Mesh(new BoxGeometry(0.08, 0.28, 0.2), bladeMat);
  tip.position.y = -2.55;
  tip.castShadow = true;
  root.add(tip);

  const guard = new Mesh(new BoxGeometry(0.55, 0.14, 0.35), hiltMat);
  guard.position.y = -0.33;
  guard.castShadow = true;
  root.add(guard);

  const handle = new Mesh(
    new CylinderGeometry(0.09, 0.1, 0.55, 10),
    hiltMat,
  );
  handle.position.y = 0;
  handle.castShadow = true;
  root.add(handle);

  // Pommel toward the wrist / into the palm side (+Y)
  const pommel = new Mesh(new BoxGeometry(0.18, 0.14, 0.18), pommelMat);
  pommel.position.y = 0.34;
  pommel.castShadow = true;
  root.add(pommel);

  return root;
}

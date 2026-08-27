import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  SphereGeometry,
  BoxGeometry,
} from "three";

export const PART_SHAPES = [
  "Block",
  "Ball",
  "Cylinder",
  "Wedge",
  "CornerWedge",
] as const;

export type PartShape = (typeof PART_SHAPES)[number];

export const PART_SHAPE_LABELS: Record<PartShape, string> = {
  Block: "Block",
  Ball: "Ball",
  Cylinder: "Cylinder",
  Wedge: "Wedge",
  CornerWedge: "Corner Wedge",
};

/** Unit box centered at origin (scaled by Part.size). */
const sharedBox = new BoxGeometry(1, 1, 1);

/** Unit sphere — radius 0.5 so diameter matches size axes. */
const sharedSphere = new SphereGeometry(0.5, 24, 16);

/** Unit cylinder — height 1, radius 0.5 (Y-up). */
const sharedCylinder = new CylinderGeometry(0.5, 0.5, 1, 24);

/** Roblox-like wedge: full height on −X, slopes to 0 on +X. */
function createWedgeGeometry(): BufferGeometry {
  // prettier-ignore
  const positions = new Float32Array([
    // bottom
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    // left (full height)
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,
    // back triangle
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
    // front triangle
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,  0.5,  0.5,
    // slope (quad)
    -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
    -0.5,  0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5, -0.5,
  ]);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Corner wedge: high corner at (−X,−Z), slopes toward +X and +Z. */
function createCornerWedgeGeometry(): BufferGeometry {
  // prettier-ignore
  const positions = new Float32Array([
    // bottom
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    // back (full height strip at -Z)
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
    // left (full height strip at -X)
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5,
    // slope triangle: peak (-0.5,0.5,-0.5) → (0.5,-0.5,-0.5) → (-0.5,-0.5,0.5)
    -0.5,  0.5, -0.5,  0.5, -0.5, -0.5, -0.5, -0.5,  0.5,
    // fill side toward +X/+Z bottom corner
    -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
  ]);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

const sharedWedge = createWedgeGeometry();
const sharedCornerWedge = createCornerWedgeGeometry();

export function geometryForShape(shape: PartShape): BufferGeometry {
  switch (shape) {
    case "Ball":
      return sharedSphere;
    case "Cylinder":
      return sharedCylinder;
    case "Wedge":
      return sharedWedge;
    case "CornerWedge":
      return sharedCornerWedge;
    case "Block":
    default:
      return sharedBox;
  }
}

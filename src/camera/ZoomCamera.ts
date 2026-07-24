import {
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Vector3,
} from "three";

/**
 * Third-person orbit camera with seamless zoom into first person.
 * Zoom/orbit aims for desiredDistance, but a ray from the look target
 * stops the camera on any registered obstacle (ground, walls, …).
 */
export class ZoomCamera {
  readonly camera: PerspectiveCamera;
  readonly target = new Vector3(0, 2.5, 0);

  /** Smoothed ideal distance (may be past a wall). */
  private distance: number;
  /** What zoom inputs aim for. */
  private desiredDistance: number;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly zoomSmooth: number;
  private theta: number;
  private phi: number;

  private readonly minPhi = 0.05;
  private readonly maxPhi = Math.PI - 0.08;
  /** Pull camera slightly off the hit surface. */
  private readonly collisionSkin = 0.3;
  private readonly minArm = 0.05;

  /** Distances for body fade / FP blend (studs from look target). */
  readonly fadeStart: number;
  readonly fadeEnd: number;

  private obstacles: Object3D[] = [];
  private readonly raycaster = new Raycaster();
  private readonly sphericalDir = new Vector3();
  private readonly hitPoint = new Vector3();
  private readonly lookPoint = new Vector3();
  private readonly desiredTarget = new Vector3();
  private followReady = false;
  private firstPerson = false;

  constructor(
    aspect: number,
    opts?: {
      distance?: number;
      min?: number;
      max?: number;
      zoomSmooth?: number;
      fadeStart?: number;
      fadeEnd?: number;
    },
  ) {
    const d = opts?.distance ?? 12;
    this.distance = d;
    this.desiredDistance = d;
    this.minDistance = opts?.min ?? 0;
    this.maxDistance = opts?.max ?? 40;
    this.zoomSmooth = opts?.zoomSmooth ?? 12;
    this.fadeStart = opts?.fadeStart ?? 3.5;
    this.fadeEnd = opts?.fadeEnd ?? 0.35;
    this.theta = Math.PI * 0.2;
    this.phi = Math.PI * 0.28;

    this.camera = new PerspectiveCamera(50, aspect, 0.05, 200);
    this.update(0);
  }

  setObstacles(objects: Object3D[]) {
    this.obstacles = objects;
  }

  getYaw() {
    return this.theta;
  }

  getDistance() {
    return this.distance;
  }

  isFirstPerson() {
    return this.firstPerson;
  }

  /**
   * 0 at/inside fadeEnd (full FP hide), 1 at/beyond fadeStart (fully visible).
   */
  getBodyFadeOpacity() {
    if (this.distance >= this.fadeStart) return 1;
    if (this.distance <= this.fadeEnd) return 0;
    return (this.distance - this.fadeEnd) / (this.fadeStart - this.fadeEnd);
  }

  /** Head fades out sooner / harder than the body. */
  getHeadFadeOpacity() {
    const body = this.getBodyFadeOpacity();
    // Square curve — nearly gone before camera reaches the skull
    return body * body;
  }

  zoomBy(delta: number) {
    this.desiredDistance = Math.min(
      this.maxDistance,
      Math.max(this.minDistance, this.desiredDistance + delta),
    );
  }

  panBy(deltaRadians: number) {
    this.theta += deltaRadians;
  }

  pitchBy(deltaRadians: number) {
    this.phi = Math.min(
      this.maxPhi,
      Math.max(this.minPhi, this.phi + deltaRadians),
    );
  }

  setTarget(x: number, y: number, z: number) {
    this.desiredTarget.set(x, y, z);
    if (!this.followReady) {
      this.target.copy(this.desiredTarget);
      this.followReady = true;
    }
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private directionFromAngles(out: Vector3) {
    out.set(
      Math.sin(this.phi) * Math.cos(this.theta),
      Math.cos(this.phi),
      Math.sin(this.phi) * Math.sin(this.theta),
    );
    return out;
  }

  private blockedDistance(ideal: number): number {
    if (this.obstacles.length === 0 || ideal <= this.minArm) {
      return ideal;
    }

    this.directionFromAngles(this.sphericalDir);
    this.raycaster.set(this.target, this.sphericalDir);
    this.raycaster.far = ideal;
    this.raycaster.near = 0.05;

    const hits = this.raycaster.intersectObjects(this.obstacles, true);
    if (hits.length === 0) return ideal;

    const hit = hits[0];
    return Math.max(this.minArm, hit.distance - this.collisionSkin);
  }

  /**
   * Soften look-target follow — especially Y on step-up snaps.
   */
  private smoothFollow(dt: number) {
    if (dt <= 0) {
      this.target.copy(this.desiredTarget);
      return;
    }
    // XZ stays tight; Y eases only a little when rising (step-up)
    const xzT = 1 - Math.exp(-28 * dt);
    const rising = this.desiredTarget.y > this.target.y + 0.001;
    const yT = 1 - Math.exp(-(rising ? 22 : 32) * dt);
    this.target.x += (this.desiredTarget.x - this.target.x) * xzT;
    this.target.z += (this.desiredTarget.z - this.target.z) * xzT;
    this.target.y += (this.desiredTarget.y - this.target.y) * yT;
  }

  /**
   * @param eyeWorld optional first-person eye point (head). Falls back to target.
   */
  update(dt = 0, eyeWorld?: Vector3) {
    this.smoothFollow(dt);

    if (dt > 0) {
      const t = 1 - Math.exp(-this.zoomSmooth * dt);
      this.distance += (this.desiredDistance - this.distance) * t;
    }

    this.directionFromAngles(this.sphericalDir);

    const fpBlend =
      this.distance <= this.fadeEnd
        ? 1
        : this.distance >= this.fadeStart
          ? 0
          : 1 - (this.distance - this.fadeEnd) / (this.fadeStart - this.fadeEnd);

    this.firstPerson = fpBlend > 0.85;

    const ideal = this.distance;
    const allowed = this.blockedDistance(ideal);

    // Third-person orbit point
    this.hitPoint
      .copy(this.target)
      .addScaledVector(this.sphericalDir, allowed);

    const eye = eyeWorld ?? this.target;

    if (fpBlend > 0.001) {
      // Blend into eyes; look along view dir (not into the character)
      this.camera.position.lerpVectors(this.hitPoint, eye, fpBlend);
      this.lookPoint
        .copy(this.camera.position)
        .addScaledVector(this.sphericalDir, -1);
      this.camera.lookAt(this.lookPoint);
    } else {
      this.camera.position.copy(this.hitPoint);
      this.camera.lookAt(this.target);
    }
  }
}

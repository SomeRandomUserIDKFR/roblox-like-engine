import { Euler, Plane, Raycaster, Vector2, Vector3, type Camera } from "three";
import type { Part } from "../../instances/Part";
import {
  capturePartPose,
  type PartPose,
} from "../undo/commands";
import type { HandleAxis, HandleHit, TransformHandles } from "./TransformHandles";

const _ptr = new Vector2();
const _hit = new Vector3();
const _axis = new Vector3();
const _camDir = new Vector3();
const _planeN = new Vector3();
const _origin = new Vector3();
const _tmp = new Vector3();
const _plane = new Plane();

function snap(v: number, step: number) {
  if (step <= 0) return v;
  return Math.round(v / step) * step;
}

export interface TransformCommit {
  part: Part;
  before: PartPose;
  after: PartPose;
  label: string;
}

export interface TransformDrag {
  active: boolean;
  begin(
    hit: HandleHit,
    part: Part,
    event: PointerEvent,
    canvas: HTMLElement,
    camera: Camera,
  ): void;
  move(event: PointerEvent, canvas: HTMLElement, camera: Camera, shift: boolean): void;
  end(): TransformCommit | null;
}

export function createTransformDrag(
  handles: TransformHandles,
  onChange: () => void,
): TransformDrag {
  let active = false;
  let hit: HandleHit | null = null;
  let part: Part | null = null;
  let beforePose: PartPose | null = null;
  const startPos = new Vector3();
  const startSize = new Vector3();
  const startRot = new Euler();
  let startAlong = 0;
  let startAngle = 0;
  const localAxis = new Vector3();

  function setPointer(event: PointerEvent, canvas: HTMLElement) {
    const rect = canvas.getBoundingClientRect();
    _ptr.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    _ptr.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function intersectPlane(camera: Camera, raycaster: Raycaster) {
    raycaster.setFromCamera(_ptr, camera);
    return raycaster.ray.intersectPlane(_plane, _hit);
  }

  function setupMoveScalePlane(camera: Camera, axisWorld: Vector3) {
    _origin.copy(startPos);
    camera.getWorldDirection(_camDir);
    _planeN.copy(axisWorld).cross(_camDir).cross(axisWorld);
    if (_planeN.lengthSq() < 1e-8) {
      _planeN.set(0, 1, 0).cross(axisWorld).cross(axisWorld);
    }
    _planeN.normalize();
    _plane.setFromNormalAndCoplanarPoint(_planeN, _origin);
  }

  function setupRotatePlane(axisWorld: Vector3) {
    _origin.copy(startPos);
    _plane.setFromNormalAndCoplanarPoint(axisWorld, _origin);
  }

  function alongAxis(point: Vector3, axisWorld: Vector3) {
    return point.clone().sub(_origin).dot(axisWorld);
  }

  function angleOnPlane(point: Vector3, axisWorld: Vector3) {
    _tmp.copy(point).sub(_origin);
    const ref =
      Math.abs(axisWorld.y) < 0.9
        ? new Vector3(0, 1, 0)
        : new Vector3(1, 0, 0);
    const u = new Vector3().crossVectors(axisWorld, ref).normalize();
    const v = new Vector3().crossVectors(axisWorld, u).normalize();
    return Math.atan2(_tmp.dot(v), _tmp.dot(u));
  }

  const raycaster = new Raycaster();

  return {
    get active() {
      return active;
    },
    begin(h, p, event, canvas, camera) {
      hit = h;
      part = p;
      active = true;
      beforePose = capturePartPose(p);
      startPos.copy(p.position);
      startSize.copy(p.size);
      startRot.copy(p.rotation);

      if (h.kind === "move") {
        _axis.copy(handles.axisDir(h.axis));
        setupMoveScalePlane(camera, _axis);
      } else if (h.kind === "scale") {
        localAxis.copy(handles.axisDir(h.axis));
        localAxis.applyEuler(p.rotation);
        _axis.copy(localAxis);
        setupMoveScalePlane(camera, _axis);
      } else {
        _axis.copy(handles.axisDir(h.axis));
        setupRotatePlane(_axis);
      }

      setPointer(event, canvas);
      const pt = intersectPlane(camera, raycaster);
      if (!pt) {
        active = false;
        beforePose = null;
        return;
      }
      if (h.kind === "rotate") {
        startAngle = angleOnPlane(pt, _axis);
      } else {
        startAlong = alongAxis(pt, _axis);
      }
    },
    move(event, canvas, camera, shift) {
      if (!active || !hit || !part) return;
      setPointer(event, canvas);

      if (hit.kind === "move") {
        _axis.copy(handles.axisDir(hit.axis));
        setupMoveScalePlane(camera, _axis);
        const pt = intersectPlane(camera, raycaster);
        if (!pt) return;
        let delta = alongAxis(pt, _axis) - startAlong;
        const step = shift ? 0.1 : 1;
        delta = snap(delta, step);
        part.position.copy(startPos).addScaledVector(_axis, delta);
        part.sync();
        onChange();
        return;
      }

      if (hit.kind === "scale") {
        localAxis.copy(handles.axisDir(hit.axis));
        localAxis.applyEuler(part.rotation);
        _axis.copy(localAxis);
        setupMoveScalePlane(camera, _axis);
        const pt = intersectPlane(camera, raycaster);
        if (!pt) return;
        let delta = alongAxis(pt, _axis) - startAlong;
        const step = shift ? 0.1 : 1;
        delta = snap(delta, step);
        const axis = hit.axis as HandleAxis;
        const signed = delta * hit.sign;
        const next = Math.max(0.05, startSize[axis] + signed);
        const applied = next - startSize[axis];
        part.size.copy(startSize);
        part.size[axis] = next;
        part.position.copy(startPos);
        part.position.addScaledVector(_axis, applied * 0.5 * hit.sign);
        part.sync();
        onChange();
        return;
      }

      _axis.copy(handles.axisDir(hit.axis));
      setupRotatePlane(_axis);
      const pt = intersectPlane(camera, raycaster);
      if (!pt) return;
      let ang = angleOnPlane(pt, _axis) - startAngle;
      const degStep = shift ? 1 : 15;
      const radStep = (degStep * Math.PI) / 180;
      ang = snap(ang, radStep);
      part.rotation.copy(startRot);
      part.rotation[hit.axis] = startRot[hit.axis] + ang;
      part.sync();
      onChange();
    },
    end() {
      if (!active || !part || !beforePose || !hit) {
        active = false;
        hit = null;
        part = null;
        beforePose = null;
        return null;
      }
      const after = capturePartPose(part);
      const label =
        hit.kind === "move"
          ? "Move"
          : hit.kind === "scale"
            ? "Scale"
            : "Rotate";
      const commit = { part, before: beforePose, after, label };
      active = false;
      hit = null;
      part = null;
      beforePose = null;
      return commit;
    },
  };
}

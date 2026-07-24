import type { ZoomCamera } from "./ZoomCamera";

const RMB_LOOK_SENS = 0.0028;
const SHIFT_LOOK_SENS = 0.005;
const FP_LOOK_SENS = 0.0035;

/**
 * RMB orbit look, Shift Lock, and First Person pointer-lock look.
 * Call {@link syncPointerLock} after shift / FP changes.
 */
export class LookControls {
  shiftLock = false;
  private rmbDown = false;
  private readonly shiftHud: HTMLElement | null;

  constructor(
    private readonly zoom: ZoomCamera,
    private readonly getCanvas: () => HTMLCanvasElement,
  ) {
    this.shiftHud = document.getElementById("shiftlock");
    this.bindEvents();
    this.updateShiftHud();
  }

  isLookLocked(): boolean {
    return this.shiftLock || this.zoom.isFirstPerson();
  }

  private wantsPointerLock(): boolean {
    return this.isLookLocked() || this.rmbDown;
  }

  syncPointerLock() {
    const canvas = this.getCanvas();
    if (this.wantsPointerLock()) {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    } else if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }

  toggleShiftLock() {
    this.shiftLock = !this.shiftLock;
    this.syncPointerLock();
    this.updateShiftHud();
  }

  /** Call when first-person state changes this frame. */
  onFirstPersonChange() {
    this.syncPointerLock();
    this.updateShiftHud();
  }

  updateShiftHud() {
    if (!this.shiftHud) return;
    if (this.zoom.isFirstPerson()) {
      this.shiftHud.textContent = "First Person (look lock)";
    } else {
      this.shiftHud.textContent = this.shiftLock
        ? "Shift Lock: ON"
        : "Shift Lock: OFF";
    }
  }

  private bindEvents() {
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    window.addEventListener("mousedown", (e) => {
      if (e.button === 2) this.rmbDown = true;
      this.syncPointerLock();
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button !== 2) return;
      this.rmbDown = false;
      this.syncPointerLock();
    });

    window.addEventListener("blur", () => {
      this.rmbDown = false;
      this.syncPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      if (!document.pointerLockElement) {
        this.rmbDown = false;
        if (this.shiftLock && !this.zoom.isFirstPerson()) {
          this.shiftLock = false;
          this.updateShiftHud();
        }
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== this.getCanvas()) return;
      if (!this.isLookLocked() && !this.rmbDown) return;
      const sens = this.zoom.isFirstPerson()
        ? FP_LOOK_SENS
        : this.isLookLocked()
          ? SHIFT_LOOK_SENS
          : RMB_LOOK_SENS;

      // mouse right → look/turn right; mouse up → look up
      this.zoom.panBy(e.movementX * sens);
      if (this.zoom.isFirstPerson()) {
        this.zoom.pitchBy(e.movementY * sens);
      } else {
        this.zoom.pitchBy(-e.movementY * sens);
      }
    });
  }
}

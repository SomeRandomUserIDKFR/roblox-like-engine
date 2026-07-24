import { Vector3 } from "three";
import type { Input } from "../input/Input";
import { lerpAngle } from "../math/angles";
import type { CollisionWorld } from "../physics/CollisionWorld";
import { SIZE, type R6Character } from "./R6Character";

export const MOVE_SPEED = 10;
/** Less floaty than 48, softer than Roblox’s 196.2. */
export const GRAVITY = 96;
/**
 * Peak jump ≈ full character height (feet → head top).
 * h = v²/(2g)  →  v = √(2gh)  (air time shrinks as g rises)
 */
const JUMP_HEIGHT =
  SIZE.leg.y + SIZE.torso.y + SIZE.headHeight - 0.16; // ≈ two joint nests
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
/** Ground accel — ~0.02s smooth ramp to max speed. */
export const MOVE_SMOOTH = 150;
/** Ground stop — nearly instant halt (~0.01s). */
export const STOP_SMOOTH = 120;
/** How quickly character faces move direction. */
export const TURN_SMOOTH = 12;
/** Jump allowed briefly after walking off a ledge. */
export const COYOTE_TIME = 0.12;
/** Jump press remembered briefly before landing. */
export const JUMP_BUFFER = 0.12;

/**
 * Planar velocity, jump/gravity, and facing for the local player.
 */
export class PlayerMotor {
  readonly velocity = new Vector3();
  velocityY = 0;
  grounded = true;
  facing = 0;
  /**
   * Hitbox yaw — follows move intent only, not look/spin.
   * Stops corner snaps when you turn in place against a wall.
   */
  private collideYaw = 0;

  private coyoteLeft = 0;
  private jumpBufferLeft = 0;

  /** Physics Y (collision). Display Y eases slightly on step-up. */
  private solidY: number | null = null;
  private displayY: number | null = null;

  private readonly move = new Vector3();
  private readonly desiredVel = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly focus = new Vector3();

  /** Camera-relative forward/right on XZ for the current yaw. */
  getCameraAxes(yaw: number) {
    this.forward.set(-Math.cos(yaw), 0, -Math.sin(yaw));
    this.right.set(Math.sin(yaw), 0, -Math.cos(yaw));
    return { forward: this.forward, right: this.right };
  }

  /**
   * Apply WASD/arrow move input into planar velocity (no position write yet).
   */
  applyMoveInput(dt: number, input: Input, yaw: number) {
    const { forward, right } = this.getCameraAxes(yaw);

    let axisF = 0;
    let axisR = 0;
    if (input.isDown("KeyW") || input.isDown("ArrowUp")) axisF += 1;
    if (input.isDown("KeyS") || input.isDown("ArrowDown")) axisF -= 1;
    if (input.isDown("KeyD")) axisR += 1;
    if (input.isDown("KeyA")) axisR -= 1;
    axisF = Math.max(-1, Math.min(1, axisF));
    axisR = Math.max(-1, Math.min(1, axisR));

    this.move.set(0, 0, 0);
    if (axisF !== 0 || axisR !== 0) {
      this.move.addScaledVector(forward, axisF);
      this.move.addScaledVector(right, axisR);
      const len = this.move.length();
      if (len > 1e-6) {
        this.move.multiplyScalar(MOVE_SPEED / len);
      }
      this.desiredVel.copy(this.move);
    } else {
      this.desiredVel.set(0, 0, 0);
    }

    const stopping = this.grounded && this.desiredVel.lengthSq() < 1e-6;
    const moveRate = stopping ? STOP_SMOOTH : MOVE_SMOOTH;
    const blend = 1 - Math.exp(-moveRate * dt);
    this.velocity.lerp(this.desiredVel, blend);
    if (this.velocity.lengthSq() < 0.0025) this.velocity.set(0, 0, 0);

    // Orient hitbox from wish direction only (not camera look / in-place spin)
    if (this.desiredVel.lengthSq() > 0.01) {
      const moveYaw = Math.atan2(this.desiredVel.x, this.desiredVel.z);
      this.collideYaw = lerpAngle(
        this.collideYaw,
        moveYaw,
        1 - Math.exp(-14 * dt),
      );
    }
  }

  /** Override planar velocity for sword lunge dash. */
  applyLungeBoost(
    boost: number,
    lookLocked: boolean,
    forward: Vector3,
    character: R6Character,
  ) {
    if (boost <= 0) return;
    const yawFacing = lookLocked
      ? Math.atan2(forward.x, forward.z)
      : this.facing;
    this.velocity.x = Math.sin(yawFacing) * boost;
    this.velocity.z = Math.cos(yawFacing) * boost;
    this.facing = yawFacing;
    character.root.rotation.y = this.facing;
  }

  integrate(
    dt: number,
    character: R6Character,
    input: Input,
    world: CollisionWorld,
  ) {
    // Collision uses solid Y; mesh may still be on eased display Y
    if (this.solidY !== null) {
      character.root.position.y = this.solidY;
    }

    if (input.consumePress("Space")) {
      this.jumpBufferLeft = JUMP_BUFFER;
    } else {
      this.jumpBufferLeft = Math.max(0, this.jumpBufferLeft - dt);
    }

    if (this.grounded) {
      this.coyoteLeft = COYOTE_TIME;
    } else {
      this.coyoteLeft = Math.max(0, this.coyoteLeft - dt);
    }

    this.velocityY -= GRAVITY * dt;

    const wasGrounded = this.grounded;
    const vy = { value: this.velocityY };
    const hit = world.moveAndCollide(
      character.root.position,
      this.velocity,
      vy,
      dt,
      character.getCollider(this.collideYaw),
      this.facing,
      wasGrounded,
    );
    this.velocityY = vy.value;
    this.grounded = hit.grounded;

    // After collide so buffer can fire on the landing frame; coyote covers walk-offs
    if (this.jumpBufferLeft > 0 && (this.grounded || this.coyoteLeft > 0)) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
      this.coyoteLeft = 0;
      this.jumpBufferLeft = 0;
    }

    this.solidY = character.root.position.y;
    if (this.displayY === null) this.displayY = this.solidY;

    if (!this.grounded) {
      // Airborne (jump / fall): gravity already produces a smooth arc, so the
      // visible height must track physics exactly. Easing here would lag on the
      // way down and then snap to the floor on landing instead of falling.
      this.displayY = this.solidY;
    } else {
      // Grounded: ease step-up / step-down transitions (e.g. walking stairs) so
      // the mesh doesn't pop per step. Stair descent stays grounded, so it keeps
      // this smoothing and never triggers the airborne fall animation.
      const rising = this.solidY > this.displayY + 0.002;
      const yT = 1 - Math.exp(-(rising ? 36 : 70) * dt);
      this.displayY += (this.solidY - this.displayY) * yT;
      if (Math.abs(this.solidY - this.displayY) < 0.0005) {
        this.displayY = this.solidY;
      }
    }
    character.root.position.y = this.displayY;

    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Camera look height should track solid physics Y, not eased display. */
  getFocusPoint(character: R6Character, lookHeight: number) {
    const p = character.root.position;
    const y = this.solidY ?? p.y;
    return this.focus.set(p.x, y + lookHeight, p.z);
  }

  updateFacing(
    dt: number,
    character: R6Character,
    planarSpeed: number,
    lookLocked: boolean,
    forward: Vector3,
  ) {
    if (lookLocked) {
      const camFacing = Math.atan2(forward.x, forward.z);
      this.facing = lerpAngle(this.facing, camFacing, 1 - Math.exp(-20 * dt));
      character.root.rotation.y = this.facing;
      return;
    }

    // Face wish direction (input), not post-collision velocity — sliding
    // along a wall must not snap facing to the leftover axis.
    const wishLenSq = this.desiredVel.lengthSq();
    if (wishLenSq > 0.01) {
      const targetFacing = Math.atan2(this.desiredVel.x, this.desiredVel.z);
      this.facing = lerpAngle(
        this.facing,
        targetFacing,
        1 - Math.exp(-TURN_SMOOTH * dt),
      );
      character.root.rotation.y = this.facing;
    } else if (planarSpeed > 0.6) {
      const targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
      this.facing = lerpAngle(
        this.facing,
        targetFacing,
        1 - Math.exp(-TURN_SMOOTH * dt),
      );
      character.root.rotation.y = this.facing;
    }
  }
}

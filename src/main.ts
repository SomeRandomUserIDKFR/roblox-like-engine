import { Color, Scene } from "three";
import { LookControls } from "./camera/LookControls";
import { ZoomCamera } from "./camera/ZoomCamera";
import { Input } from "./input/Input";
import { Backpack } from "./inventory/Backpack";
import { HotbarUI } from "./inventory/HotbarUI";
import { setupDemoBackpack } from "./inventory/demoLoadout";
import type { HotbarSlotIndex } from "./inventory/Backpack";
import { createClassicSword } from "./items/ClassicSword";
import { SwordControls } from "./items/SwordControls";
import { PlayerMotor } from "./player/PlayerMotor";
import { R6Character } from "./player/R6Character";
import { CollisionWorld } from "./physics/CollisionWorld";
import { createRenderer } from "./render/createRenderer";
import { createDemoWorld } from "./world/demoWorld";
import { setupLighting } from "./world/lighting";

const PAN_SPEED = 1.8;
const LOOK_HEIGHT = 1.2;

async function main() {
  const scene = new Scene();
  scene.background = new Color(0x87ceeb);
  scene.fog = null;

  const zoom = new ZoomCamera(window.innerWidth / window.innerHeight, {
    min: 0,
    fadeStart: 3.25,
    fadeEnd: 0.4,
  });
  const character = new R6Character();
  scene.add(character.getObject3D());
  const input = new Input();
  const motor = new PlayerMotor();

  const backpack = new Backpack();
  const hotbarUi = new HotbarUI(backpack);
  setupDemoBackpack(backpack);
  void hotbarUi;

  const sword = createClassicSword();
  character.setRightHandTool(sword);
  character.setRightHandToolVisible(false);
  const swordControls = new SwordControls();

  function syncEquippedTool() {
    const item = backpack.getEquippedItem();
    character.setRightHandToolVisible(item?.id === "sword");
  }
  backpack.onChange(syncEquippedTool);
  syncEquippedTool();

  for (const part of Object.values(character.parts)) {
    part.setMaterialPreset("plastic");
  }

  const world = createDemoWorld(scene);
  const collision = new CollisionWorld();
  collision.addMany(world.workspace.getColliders());
  collision.addRamps(world.workspace.getRamps());
  zoom.setObstacles(world.workspace.getObstacles());
  setupLighting(scene);

  const renderer = await createRenderer();
  const look = new LookControls(zoom, () => renderer.domElement);

  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoom.zoomBy(e.deltaY * 0.04);
    },
    { passive: false },
  );

  window.addEventListener("resize", () => {
    zoom.setAspect(window.innerWidth / window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let last = performance.now();
  let wasFirstPerson = false;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (input.consumeShiftPress()) {
      look.toggleShiftLock();
    }

    const digit = input.consumeDigitPress();
    if (digit !== null) {
      backpack.equipSlot(digit as HotbarSlotIndex);
    }

    if (input.isDown("KeyI")) zoom.zoomBy(-18 * dt);
    if (input.isDown("KeyO")) zoom.zoomBy(18 * dt);
    if (input.isDown("ArrowLeft")) zoom.panBy(-PAN_SPEED * dt);
    if (input.isDown("ArrowRight")) zoom.panBy(PAN_SPEED * dt);

    const yaw = zoom.getYaw();
    const { forward } = motor.getCameraAxes(yaw);
    motor.applyMoveInput(dt, input, yaw);

    const swordOut = backpack.getEquippedItem()?.id === "sword";
    const lungeBoost = swordControls.update(
      dt,
      swordOut,
      motor.grounded,
      character,
    );
    motor.applyLungeBoost(lungeBoost, look.isLookLocked(), forward, character);

    const planarSpeed = motor.integrate(dt, character, input, collision);

    character.updateAnimation(
      dt,
      planarSpeed,
      motor.grounded,
      motor.velocityY,
      swordOut ? swordControls.lunge.weight : 0,
      swordOut ? 1 : 0,
      swordOut ? swordControls.slash.weight : 0,
    );

    const eye = character.getEyeWorldPosition();
    const focus = motor.getFocusPoint(character, LOOK_HEIGHT);
    zoom.setTarget(focus.x, focus.y, focus.z);
    zoom.update(dt, eye);

    character.setFirstPersonFade(
      zoom.getBodyFadeOpacity(),
      zoom.getHeadFadeOpacity(),
    );

    motor.updateFacing(
      dt,
      character,
      planarSpeed,
      look.isLookLocked(),
      forward,
    );

    const fp = zoom.isFirstPerson();
    if (fp !== wasFirstPerson) {
      wasFirstPerson = fp;
      look.onFirstPersonChange();
    }

    renderer.render(scene, zoom.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main().catch((err) => {
  console.error(err);
  const hud = document.getElementById("hud");
  if (hud) hud.textContent = `Failed to start renderer: ${err}`;
});

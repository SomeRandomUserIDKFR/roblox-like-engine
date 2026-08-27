import { Color, Scene, Vector3 } from "three";
import { LookControls } from "../camera/LookControls";
import { ZoomCamera } from "../camera/ZoomCamera";
import { EmoteController } from "../emotes/EmoteController";
import { emotePose } from "../emotes/emotes";
import { ChatBubbles } from "../ui/ChatBubbles";
import { ChatCommand } from "../ui/ChatCommand";
import { CustomizationPanel } from "../ui/CustomizationPanel";
import { mountPlayHud } from "../ui/PlayHud";
import { Input } from "../input/Input";
import { Backpack } from "../inventory/Backpack";
import { HotbarUI } from "../inventory/HotbarUI";
import { setupDemoBackpack } from "../inventory/demoLoadout";
import type { HotbarSlotIndex } from "../inventory/Backpack";
import { SwordControls } from "../items/SwordControls";
import {
  findSpawnPosition,
  workspaceFromSnapshot,
  type PlaceSnapshot,
} from "../place/PlaceSnapshot";
import { PlayerMotor } from "../player/PlayerMotor";
import { R6Character } from "../player/R6Character";
import { Humanoid } from "../player/Humanoid";
import { RespawnRuntime } from "../player/RespawnRuntime";
import { TraitRuntime } from "../physics/TraitRuntime";
import { CollisionWorld } from "../physics/CollisionWorld";
import { DynamicPhysics } from "../physics/DynamicPhysics";
import { TouchRuntime } from "../physics/TouchRuntime";
import { createRenderer } from "../render/createRenderer";
import { ScriptRuntime } from "../scripting/ScriptRuntime";
import { GuiRuntime } from "../gui/GuiRuntime";
import { ToolRuntime } from "../tools/ToolRuntime";
import { createDemoWorld } from "../world/demoWorld";
import { setupLighting } from "../world/lighting";
import type { Workspace } from "../instances/Workspace";
import { DataStoreService } from "../services/DataStoreService";
import { GameRoot } from "../services/GameRoot";
import { makeLocalPlayer, PlayersService } from "../services/Players";
import { NetClient } from "../net/NetClient";
import { RemoteAvatar } from "../net/RemoteAvatar";

const PAN_SPEED = 1.8;
const LOOK_HEIGHT = 1.2;

export interface PolyXHandle {
  dispose: () => void;
}

/** Live play session — games built on PolyX can hook this. */
export interface PolyXPlayApi {
  scene: Scene;
  workspace: Workspace;
  character: R6Character;
  humanoid: Humanoid;
  motor: PlayerMotor;
  input: Input;
  collision: CollisionWorld;
  dynamics: DynamicPhysics;
  traits: TraitRuntime;
  backpack: Backpack;
  zoom: ZoomCamera;
}

export interface StartPolyXOptions {
  /** HedronX place to play; omit for the built-in demo map. */
  place?: PlaceSnapshot | null;
  /** Custom world builder. Ignored when `place` is set. */
  createWorld?: (scene: Scene) => Workspace;
  /** Skip the demo sword/apple/block hotbar. */
  skipDemoLoadout?: boolean;
  /** Called once after lighting, physics, and scripts are ready. */
  onReady?: (api: PolyXPlayApi) => void | (() => void);
  /** Called each simulation tick after character integrate. */
  onFrame?: (dt: number, api: PolyXPlayApi) => void;
  /** Attempt WebSocket multiplayer (npm run server). */
  multiplayer?: boolean;
}

/** Boot the PolyX play view (canvas + character + world). */
export async function startPolyX(
  opts: StartPolyXOptions = {},
): Promise<PolyXHandle> {
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
  const humanoid = new Humanoid();

  const backpack = new Backpack();
  const hotbarUi = new HotbarUI(backpack);
  if (!opts.skipDemoLoadout) {
    setupDemoBackpack(backpack);
  }

  const emotes = new EmoteController();
  const chatBubbles = new ChatBubbles();
  const chatCmd = new ChatCommand(
    (name) => emotes.play(name),
    () => emotes.stop(),
    (text) => chatBubbles.say(text),
  );
  const customize = new CustomizationPanel(character);

  const swordControls = new SwordControls();

  for (const part of Object.values(character.parts)) {
    part.setMaterialPreset("plastic");
  }

  let workspace: Workspace;
  if (opts.place) {
    workspace = workspaceFromSnapshot(opts.place);
    workspace.mount(scene);
  } else if (opts.createWorld) {
    workspace = opts.createWorld(scene);
  } else {
    const demo = createDemoWorld(scene);
    workspace = demo.workspace;
  }

  const spawn = findSpawnPosition(workspace);
  character.root.position.set(spawn.x, spawn.y, spawn.z);

  const localPlayer = makeLocalPlayer("Player1", character, humanoid);
  const players = new PlayersService(localPlayer);
  const dataStores = new DataStoreService();
  const game = new GameRoot(workspace, players, dataStores);

  const collision = new CollisionWorld();
  const dynamics = new DynamicPhysics(workspace, collision);
  dynamics.refreshStaticColliders();
  dynamics.syncPlayerColliders();
  zoom.setObstacles(workspace.getObstacles());
  setupLighting(scene);

  const traits = new TraitRuntime(workspace, collision);
  const touches = new TouchRuntime(workspace);
  touches.bindAll();
  const respawn = new RespawnRuntime(workspace, character, humanoid, motor);
  const playHud = mountPlayHud(humanoid);

  const net = new NetClient();
  const remotes = new Map<string, RemoteAvatar>();

  const toolRuntime = new ToolRuntime(workspace, character, backpack);
  toolRuntime.start();
  const guiRuntime = new GuiRuntime(workspace);
  await guiRuntime.mount();
  const scriptRuntime = new ScriptRuntime(workspace, {
    game,
    localPlayer,
    humanoid,
    net,
  });
  void scriptRuntime.startAll();

  const api: PolyXPlayApi = {
    scene,
    workspace,
    character,
    humanoid,
    motor,
    input,
    collision,
    dynamics,
    traits,
    backpack,
    zoom,
  };
  const extraDispose = opts.onReady?.(api) ?? undefined;

  const onToolClick = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest?.("#player-gui")) return;
    toolRuntime.activateEquipped();
  };
  window.addEventListener("mousedown", onToolClick);

  const renderer = await createRenderer();
  const look = new LookControls(zoom, () => renderer.domElement);

  if (opts.multiplayer !== false) {
    net.connect(undefined, localPlayer.Name);
    net.Connected.Connect((id) => {
      localPlayer.UserId = id;
      playHud.setNetStatus(`Online · id ${id} · ${net.peers.size} peers`);
    });
    net.Disconnected.Connect(() => {
      playHud.setNetStatus("Solo · MP server offline (npm run server)");
      for (const [, av] of remotes) av.dispose();
      remotes.clear();
    });
    net.PeerJoined.Connect((peer) => {
      if (remotes.has(peer.id)) return;
      const av = new RemoteAvatar(peer);
      scene.add(av.group);
      remotes.set(peer.id, av);
      players.addRemote({
        UserId: peer.id,
        Name: peer.name,
        DisplayName: peer.name,
        Character: av.character,
        Humanoid: null,
      });
      playHud.setNetStatus(`Online · ${net.peers.size} peers`);
    });
    net.PeerLeft.Connect((id) => {
      remotes.get(id)?.dispose();
      remotes.delete(id);
      players.removeRemote(id);
      playHud.setNetStatus(
        net.connected
          ? `Online · ${net.peers.size} peers`
          : "Solo · MP server offline",
      );
    });
    net.PeerPose.Connect((peer) => {
      let av = remotes.get(peer.id);
      if (!av) {
        av = new RemoteAvatar(peer);
        scene.add(av.group);
        remotes.set(peer.id, av);
      }
      av.apply(peer);
    });
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoom.zoomBy(e.deltaY * 0.04);
  };
  window.addEventListener("wheel", onWheel, { passive: false });

  const onResize = () => {
    zoom.setAspect(window.innerWidth / window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  // Kill brick / damage zones via Touched
  for (const part of workspace.parts) {
    if (/kill|lava|damage/i.test(part.name)) {
      touches.Touched(part).Connect(() => {
        if (!humanoid.IsDead) humanoid.TakeDamage(100);
      });
    }
  }

  // Sword hits deal damage in MP later; local: breakables already in traits
  const hud = document.getElementById("hud");
  if (hud && opts.place) {
    const note = hud.querySelector(".play-map-note");
    if (note) note.remove();
    const span = document.createElement("div");
    span.className = "play-map-note";
    span.innerHTML = `<b>Playing HedronX map</b> · ${workspace.parts.length} parts · <a href="/HedronX">Back to studio</a>`;
    span.style.marginTop = "6px";
    hud.appendChild(span);
  }

  let last = performance.now();
  let wasFirstPerson = false;
  const chatAnchor = new Vector3();
  let alive = true;
  let raf = 0;
  const collider = character.getCollider();

  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (humanoid.IsDead) {
      respawn.update(dt);
      guiRuntime.update(dt);
      renderer.render(scene, zoom.camera);
      raf = requestAnimationFrame(frame);
      return;
    }

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

    const support = traits.sampleSupport(character);
    const feel = traits.surfaceMoveRates(support);
    motor.setSurfaceFeel(feel.moveSmooth, feel.stopSmooth, feel.speedScale);

    motor.applyMoveInput(dt, input, yaw);

    const swordOut = backpack.getEquippedItem()?.id === "sword";
    const lungeBoost = swordControls.update(
      dt,
      swordOut,
      motor.grounded,
      character,
    );
    motor.applyLungeBoost(lungeBoost, look.isLookLocked(), forward, character);

    const playerBody = collision.bodyAt(character.root.position, collider);
    dynamics.update(dt, playerBody);
    dynamics.syncPlayerColliders();

    const wasGrounded = motor.grounded;
    const prevVy = motor.velocityY;
    const planarSpeed = motor.integrate(dt, character, input, collision);

    humanoid.setState(
      !motor.grounded
        ? motor.velocityY > 2
          ? "Jumping"
          : "Freefall"
        : "Running",
    );

    const swordHitActive =
      swordOut &&
      (swordControls.slash.weight > 0.25 || swordControls.lunge.weight > 0.25);

    traits.applyAfterIntegrate(
      dt,
      motor,
      character,
      support,
      wasGrounded,
      prevVy,
      swordHitActive,
    );

    if (traits.submerged && input.isDown("Space")) {
      motor.velocityY += 55 * dt;
      humanoid.setState("Swimming");
    }

    touches.update(character.root.position, collider, (r, c) =>
      collision.bodyAt(r, c),
    );

    zoom.setObstacles(workspace.getObstacles());

    const movementHeld =
      input.isDown("KeyW") ||
      input.isDown("KeyS") ||
      input.isDown("KeyA") ||
      input.isDown("KeyD") ||
      input.isDown("ArrowUp") ||
      input.isDown("ArrowDown");
    const swordActive =
      swordOut &&
      (swordControls.slash.weight > 0.02 || swordControls.lunge.weight > 0.02);
    if (!motor.grounded || planarSpeed > 0.6 || movementHeld || swordActive) {
      emotes.stop();
    }

    if (emotes.active) {
      character.applyEmotePose(dt, emotePose(emotes.name, emotes.elapsed));
      emotes.tick(dt);
    } else {
      character.updateAnimation(
        dt,
        planarSpeed,
        motor.grounded,
        motor.velocityY,
        swordOut ? swordControls.lunge.weight : 0,
        swordOut ? 1 : 0,
        swordOut ? swordControls.slash.weight : 0,
      );
    }

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

    character.getEyeWorldPosition(chatAnchor);
    chatAnchor.y += 1.0;
    chatBubbles.update(zoom.camera, chatAnchor);

    net.tick(dt, {
      x: character.root.position.x,
      y: character.root.position.y,
      z: character.root.position.z,
      yaw: character.root.rotation.y,
      health: humanoid.Health,
      name: localPlayer.Name,
    });

    for (const [id, av] of remotes) {
      const peer = net.peers.get(id);
      if (peer) av.apply(peer);
    }

    guiRuntime.update(dt);
    respawn.update(dt);
    opts.onFrame?.(dt, api);

    renderer.render(scene, zoom.camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    dispose: () => {
      alive = false;
      extraDispose?.();
      scriptRuntime.stop();
      toolRuntime.dispose();
      guiRuntime.dispose();
      respawn.dispose();
      playHud.dispose();
      net.disconnect();
      for (const [, av] of remotes) av.dispose();
      remotes.clear();
      window.removeEventListener("mousedown", onToolClick);
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      look.dispose();
      input.dispose();
      renderer.domElement.remove();
      hotbarUi.root.remove();
      document.getElementById("chatbar")?.remove();
      document.getElementById("customize-toggle")?.remove();
      document.getElementById("customize-panel")?.remove();
      document.querySelector(".chat-bubbles")?.remove();
      document.querySelector(".play-map-note")?.remove();
      void chatCmd;
      void customize;
      character.getObject3D().removeFromParent();
      workspace.root.removeFromParent();
    },
  };
}

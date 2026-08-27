import { Signal } from "../core/Signal";

export interface NetPeerPose {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
}

type Inbound =
  | { type: "welcome"; id: string; peers: NetPeerPose[] }
  | { type: "join"; peer: NetPeerPose }
  | { type: "leave"; id: string }
  | { type: "pose"; peer: NetPeerPose }
  | { type: "remote"; name: string; from: string; args: unknown[] }
  | { type: "chat"; from: string; name: string; text: string };

/**
 * Browser WebSocket client for PolyX multiplayer.
 * Connects to `ws://host:8787` (see server/mp-server.mjs).
 */
export class NetClient {
  readonly Connected = new Signal<[id: string]>();
  readonly Disconnected = new Signal<[]>();
  readonly PeerJoined = new Signal<[peer: NetPeerPose]>();
  readonly PeerLeft = new Signal<[id: string]>();
  readonly PeerPose = new Signal<[peer: NetPeerPose]>();
  readonly RemoteEvent = new Signal<[name: string, from: string, args: unknown[]]>();

  private ws: WebSocket | null = null;
  private localId = "";
  private sendPoseTimer = 0;
  readonly peers = new Map<string, NetPeerPose>();

  get id() {
    return this.localId;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(url = defaultWsUrl(), name = "Player") {
    if (this.ws) this.disconnect();
    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.warn("[Net] connect failed", err);
      return;
    }

    this.ws.addEventListener("open", () => {
      this.send({ type: "hello", name });
    });

    this.ws.addEventListener("message", (ev) => {
      let msg: Inbound;
      try {
        msg = JSON.parse(String(ev.data)) as Inbound;
      } catch {
        return;
      }
      this.handle(msg);
    });

    this.ws.addEventListener("close", () => {
      this.ws = null;
      this.Disconnected.Fire();
    });

    this.ws.addEventListener("error", () => {
      /* close will follow */
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.peers.clear();
  }

  /** Call each frame; throttles pose packets. */
  tick(
    dt: number,
    pose: { x: number; y: number; z: number; yaw: number; health: number; name: string },
  ) {
    if (!this.connected) return;
    this.sendPoseTimer += dt;
    if (this.sendPoseTimer < 0.05) return;
    this.sendPoseTimer = 0;
    this.send({
      type: "pose",
      x: pose.x,
      y: pose.y,
      z: pose.z,
      yaw: pose.yaw,
      health: pose.health,
      name: pose.name,
    });
  }

  fireRemote(name: string, args: unknown[]) {
    if (!this.connected) return;
    this.send({ type: "remote", name, args });
  }

  private handle(msg: Inbound) {
    if (msg.type === "welcome") {
      this.localId = msg.id;
      this.peers.clear();
      for (const p of msg.peers) this.peers.set(p.id, p);
      this.Connected.Fire(msg.id);
      return;
    }
    if (msg.type === "join") {
      this.peers.set(msg.peer.id, msg.peer);
      this.PeerJoined.Fire(msg.peer);
      return;
    }
    if (msg.type === "leave") {
      this.peers.delete(msg.id);
      this.PeerLeft.Fire(msg.id);
      return;
    }
    if (msg.type === "pose") {
      this.peers.set(msg.peer.id, msg.peer);
      this.PeerPose.Fire(msg.peer);
      return;
    }
    if (msg.type === "remote") {
      this.RemoteEvent.Fire(msg.name, msg.from, msg.args);
    }
  }

  private send(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }
}

function defaultWsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.hostname || "localhost";
  return `${proto}//${host}:8787`;
}

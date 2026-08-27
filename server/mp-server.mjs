/**
 * Minimal PolyX multiplayer relay.
 * Run: node server/mp-server.mjs
 * Clients connect to ws://localhost:8787
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.POLYX_MP_PORT || 8787);

/** @typedef {{ id: string, name: string, x: number, y: number, z: number, yaw: number, health: number, ws: import('ws').WebSocket }} Client */

/** @type {Map<string, Client>} */
const clients = new Map();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function poseOf(c) {
  return {
    id: c.id,
    name: c.name,
    x: c.x,
    y: c.y,
    z: c.z,
    yaw: c.yaw,
    health: c.health,
  };
}

function broadcast(exceptId, msg) {
  const raw = JSON.stringify(msg);
  for (const [id, c] of clients) {
    if (id === exceptId) continue;
    if (c.ws.readyState === 1) c.ws.send(raw);
  }
}

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`PolyX MP relay · ${clients.size} online\n`);
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  /** @type {Client | null} */
  let client = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }

    if (msg.type === "hello" && !client) {
      const id = uid();
      client = {
        id,
        name: String(msg.name || "Player").slice(0, 24),
        x: 0,
        y: 5,
        z: 0,
        yaw: 0,
        health: 100,
        ws,
      };
      clients.set(id, client);
      ws.send(
        JSON.stringify({
          type: "welcome",
          id,
          peers: [...clients.values()]
            .filter((c) => c.id !== id)
            .map(poseOf),
        }),
      );
      broadcast(id, { type: "join", peer: poseOf(client) });
      console.log(`[mp] join ${client.name} (${id}) · ${clients.size} online`);
      return;
    }

    if (!client) return;

    if (msg.type === "pose") {
      client.x = Number(msg.x) || 0;
      client.y = Number(msg.y) || 0;
      client.z = Number(msg.z) || 0;
      client.yaw = Number(msg.yaw) || 0;
      client.health = Number(msg.health) || 0;
      if (typeof msg.name === "string" && msg.name) {
        client.name = msg.name.slice(0, 24);
      }
      broadcast(client.id, { type: "pose", peer: poseOf(client) });
      return;
    }

    if (msg.type === "remote") {
      broadcast(client.id, {
        type: "remote",
        name: String(msg.name || ""),
        from: client.id,
        args: Array.isArray(msg.args) ? msg.args : [],
      });
    }
  });

  ws.on("close", () => {
    if (!client) return;
    clients.delete(client.id);
    broadcast(client.id, { type: "leave", id: client.id });
    console.log(`[mp] leave ${client.name} · ${clients.size} online`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`PolyX multiplayer relay on ws://localhost:${PORT}`);
});

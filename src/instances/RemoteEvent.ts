import { Signal } from "../core/Signal";
import { Instance } from "./Instance";

/**
 * Place-local remote. In solo Play, OnServerEvent ≈ OnClientEvent (loopback).
 * With multiplayer, the NetRuntime routes FireServer / FireClient across peers.
 */
export class RemoteEvent extends Instance {
  readonly OnServerEvent = new Signal<[player: unknown, ...args: unknown[]]>();
  readonly OnClientEvent = new Signal<[...args: unknown[]]>();

  /** Client → server (loopback fires OnServerEvent with local player). */
  FireServer = (...args: unknown[]) => {
    this._fireServer?.(args);
  };

  /** Server → all / one client (loopback fires OnClientEvent). */
  FireClient = (_player: unknown, ...args: unknown[]) => {
    this.OnClientEvent.Fire(...args);
  };

  FireAllClients = (...args: unknown[]) => {
    this.OnClientEvent.Fire(...args);
  };

  /** Wired by ScriptRuntime / NetRuntime. */
  _fireServer: ((args: unknown[]) => void) | null = null;

  constructor(name = "RemoteEvent") {
    super(name);
  }
}

/** Local-only event bus (no network). */
export class BindableEvent extends Instance {
  readonly Event = new Signal<[...args: unknown[]]>();

  Fire(...args: unknown[]) {
    this.Event.Fire(...args);
  }

  constructor(name = "BindableEvent") {
    super(name);
  }
}

import type { Instance } from "../instances/Instance";
import { ModuleScript, Script, SourceScript } from "../instances/Script";
import { BindableEvent, RemoteEvent } from "../instances/RemoteEvent";
import { findToolAncestor } from "../instances/Tool";
import type { Workspace } from "../instances/Workspace";
import type { GameRoot } from "../services/GameRoot";
import type { Humanoid } from "../player/Humanoid";
import type { Player } from "../services/Players";
import type { NetClient } from "../net/NetClient";
import { py } from "./py";
import { makeRaycastApi } from "./raycast";
import { transpileTs } from "./transpile";
import type { ScriptEnv } from "./types";

export type { ScriptEnv } from "./types";

export interface ScriptRuntimeOptions {
  game: GameRoot;
  localPlayer: Player;
  humanoid: Humanoid | null;
  net?: NetClient | null;
}

/**
 * Runs Script instances and resolves ModuleScript requires at Play.
 * Globals are injected only — no free `window` / `document` access.
 */
export class ScriptRuntime {
  private readonly modules = new Map<ModuleScript, unknown>();
  private readonly loading = new Set<ModuleScript>();
  private readonly logs: string[] = [];
  private stopped = false;
  private readonly game: GameRoot;
  private readonly localPlayer: Player;
  private readonly humanoid: Humanoid | null;
  private readonly net: NetClient | null;

  constructor(
    private readonly workspace: Workspace,
    opts: ScriptRuntimeOptions,
  ) {
    this.game = opts.game;
    this.localPlayer = opts.localPlayer;
    this.humanoid = opts.humanoid;
    this.net = opts.net ?? null;
    this.wireRemotes();
  }

  get output() {
    return this.logs;
  }

  stop() {
    this.stopped = true;
  }

  private wireRemotes() {
    const remotes = this.workspace
      .getDescendants()
      .filter((d): d is RemoteEvent => d instanceof RemoteEvent);

    for (const remote of remotes) {
      remote._fireServer = (args) => {
        if (this.net?.connected) {
          this.net.fireRemote(remote.name, args);
        }
        // Loopback authority for solo / always receive locally as server
        remote.OnServerEvent.Fire(this.localPlayer, ...args);
      };
    }

    this.net?.RemoteEvent.Connect((name, from, args) => {
      const remote = remotes.find((r) => r.name === name);
      if (!remote) return;
      remote.OnClientEvent.Fire(...args);
      void from;
    });
  }

  private print = (...args: unknown[]) => {
    const line = args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");
    this.logs.push(line);
    console.log(`[Script] ${line}`);
  };

  private wait = (seconds = 0) => {
    if (this.stopped) return Promise.resolve();
    const ms = Math.max(0, (seconds ?? 0) * 1000);
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  };

  private findModule(name: string): ModuleScript | undefined {
    return this.workspace
      .getDescendants()
      .find(
        (d): d is ModuleScript =>
          d instanceof ModuleScript && d.name === name,
      );
  }

  require = (target: string | ModuleScript): unknown => {
    let mod: ModuleScript | undefined;
    if (typeof target === "string") {
      mod = this.findModule(target);
      if (!mod) throw new Error(`require(): ModuleScript "${target}" not found`);
    } else if (target instanceof ModuleScript) {
      mod = target;
    } else {
      throw new Error("require(): expected ModuleScript or name string");
    }

    if (this.modules.has(mod)) return this.modules.get(mod)!;
    if (this.loading.has(mod)) {
      throw new Error(`require(): cyclic dependency on "${mod.name}"`);
    }

    this.loading.add(mod);
    try {
      const exports = this.evalModule(mod);
      this.modules.set(mod, exports);
      return exports;
    } finally {
      this.loading.delete(mod);
    }
  };

  private makeVector3(): ScriptEnv["Vector3"] {
    return class Vector3 {
      x: number;
      y: number;
      z: number;
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      static new(x = 0, y = 0, z = 0) {
        return new Vector3(x, y, z);
      }
    };
  }

  private makeEnv(): ScriptEnv {
    const Raycast = makeRaycastApi(this.workspace);
    (this.workspace as Workspace & { Raycast?: typeof Raycast }).Raycast =
      Raycast;

    return {
      workspace: this.workspace,
      game: this.game,
      Players: this.game.Players,
      DataStoreService: this.game.DataStoreService,
      print: this.print,
      wait: this.wait,
      task: {
        wait: this.wait,
        spawn: (fn: () => void | Promise<void>) => {
          void Promise.resolve().then(fn);
        },
        delay: (sec: number, fn: () => void | Promise<void>) => {
          void this.wait(sec).then(fn);
        },
      },
      py,
      require: this.require,
      Vector3: this.makeVector3(),
      tool: null,
      script: null as unknown as SourceScript,
      LocalPlayer: this.localPlayer,
      Humanoid: this.humanoid,
    };
  }

  private evalModule(mod: ModuleScript): unknown {
    if (!mod.enabled) return {};
    const js = transpileTs(mod.source, `${mod.name}.ts`, true);
    const env = this.makeEnv();
    env.tool = findToolAncestor(mod) ?? null;
    env.script = mod;
    const body = `
      const exports = {};
      const module = { exports };
      ${js}
      return module.exports;
    `;
    return this.runSandboxed(body, env);
  }

  /**
   * Only named globals are in scope — no window/document/fetch by default.
   */
  private runSandboxed(js: string, env: ScriptEnv): unknown {
    const fn = new Function(
      "workspace",
      "game",
      "Players",
      "DataStoreService",
      "script",
      "print",
      "wait",
      "task",
      "py",
      "require",
      "Vector3",
      "tool",
      "LocalPlayer",
      "Humanoid",
      `"use strict";\n${js}`,
    );
    return fn(
      env.workspace,
      env.game,
      env.Players,
      env.DataStoreService,
      env.script,
      env.print,
      env.wait,
      env.task,
      env.py,
      env.require,
      env.Vector3,
      env.tool,
      env.LocalPlayer,
      env.Humanoid,
    );
  }

  /** Start all enabled Scripts under Workspace. */
  async startAll(): Promise<void> {
    const scripts = this.workspace
      .getDescendants()
      .filter((d): d is Script => d instanceof Script && d.enabled);

    for (const s of scripts) {
      if (this.stopped) return;
      try {
        await this.runScript(s);
      } catch (err) {
        this.print(`ERROR in ${s.name}:`, String(err));
        console.error(err);
      }
    }
  }

  async runScript(script: Script): Promise<void> {
    if (!script.enabled || this.stopped) return;
    const js = transpileTs(script.source, `${script.name}.ts`, false);
    const env = this.makeEnv();
    env.tool = findToolAncestor(script) ?? null;
    env.script = script;
    const body = `return (async () => {\n${js}\n})();`;
    const result = this.runSandboxed(body, env);
    await result;
  }
}

export function isSourceScript(inst: Instance): inst is SourceScript {
  return inst instanceof Script || inst instanceof ModuleScript;
}

export function isRemoteLike(
  inst: Instance,
): inst is RemoteEvent | BindableEvent {
  return inst instanceof RemoteEvent || inst instanceof BindableEvent;
}

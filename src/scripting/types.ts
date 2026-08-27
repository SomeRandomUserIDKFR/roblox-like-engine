import type { ModuleScript, SourceScript } from "../instances/Script";
import type { Tool } from "../instances/Tool";
import type { Workspace } from "../instances/Workspace";
import type { GameRoot } from "../services/GameRoot";
import type { Humanoid } from "../player/Humanoid";
import type { Player, PlayersService } from "../services/Players";
import type { DataStoreService } from "../services/DataStoreService";

export interface ScriptEnv {
  workspace: Workspace;
  game: GameRoot;
  Players: PlayersService;
  DataStoreService: DataStoreService;
  print: (...args: unknown[]) => void;
  wait: (seconds?: number) => Promise<void>;
  task: {
    wait: (seconds?: number) => Promise<void>;
    spawn: (fn: () => void | Promise<void>) => void;
    delay: (sec: number, fn: () => void | Promise<void>) => void;
  };
  py: (expr: string) => number | boolean | string | null;
  require: (target: string | ModuleScript) => unknown;
  Vector3: {
    new (x?: number, y?: number, z?: number): {
      x: number;
      y: number;
      z: number;
    };
    new?(x?: number, y?: number, z?: number): {
      x: number;
      y: number;
      z: number;
    };
  };
  /** Set when the running script lives under a Tool. */
  tool: Tool | null;
  script: SourceScript | null;
  LocalPlayer: Player;
  Humanoid: Humanoid | null;
}

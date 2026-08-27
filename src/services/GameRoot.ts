import type { DataStoreService } from "./DataStoreService";
import type { PlayersService } from "./Players";
import type { Workspace } from "../instances/Workspace";

export type ServiceName =
  | "Workspace"
  | "Players"
  | "DataStoreService"
  | "ReplicatedStorage"
  | "ServerStorage";

/**
 * Minimal `game` / GetService surface for scripts.
 */
export class GameRoot {
  Workspace: Workspace;
  Players: PlayersService;
  DataStoreService: DataStoreService;
  /** Folder-like: scripts often parent remotes here — we alias Workspace for now. */
  ReplicatedStorage: Workspace;
  ServerStorage: Workspace;

  PlaceId = "local";
  JobId = "solo";
  CreatorId = "studio";

  constructor(
    workspace: Workspace,
    players: PlayersService,
    dataStores: DataStoreService,
  ) {
    this.Workspace = workspace;
    this.Players = players;
    this.DataStoreService = dataStores;
    this.ReplicatedStorage = workspace;
    this.ServerStorage = workspace;
  }

  GetService(name: ServiceName | string): unknown {
    switch (name) {
      case "Workspace":
        return this.Workspace;
      case "Players":
        return this.Players;
      case "DataStoreService":
        return this.DataStoreService;
      case "ReplicatedStorage":
        return this.ReplicatedStorage;
      case "ServerStorage":
        return this.ServerStorage;
      default:
        throw new Error(`GetService: unknown service "${name}"`);
    }
  }
}

import { Signal } from "../core/Signal";
import type { Humanoid } from "../player/Humanoid";
import type { R6Character } from "../player/R6Character";

export interface Player {
  UserId: string;
  Name: string;
  DisplayName: string;
  Character: R6Character | null;
  Humanoid: Humanoid | null;
}

/**
 * Roblox-like Players service (local + remote peers when networked).
 */
export class PlayersService {
  readonly PlayerAdded = new Signal<[player: Player]>();
  readonly PlayerRemoving = new Signal<[player: Player]>();

  LocalPlayer: Player;
  private readonly byId = new Map<string, Player>();

  constructor(local: Player) {
    this.LocalPlayer = local;
    this.byId.set(local.UserId, local);
  }

  GetPlayers(): Player[] {
    return [...this.byId.values()];
  }

  GetPlayerByUserId(id: string): Player | undefined {
    return this.byId.get(id);
  }

  addRemote(player: Player) {
    if (this.byId.has(player.UserId)) return;
    this.byId.set(player.UserId, player);
    this.PlayerAdded.Fire(player);
  }

  removeRemote(userId: string) {
    const p = this.byId.get(userId);
    if (!p || p === this.LocalPlayer) return;
    this.byId.delete(userId);
    this.PlayerRemoving.Fire(p);
  }
}

export function makeLocalPlayer(
  name = "Player",
  character: R6Character | null = null,
  humanoid: Humanoid | null = null,
): Player {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `p${Math.floor(Math.random() * 1e6)}`;
  return {
    UserId: id,
    Name: name,
    DisplayName: name,
    Character: character,
    Humanoid: humanoid,
  };
}

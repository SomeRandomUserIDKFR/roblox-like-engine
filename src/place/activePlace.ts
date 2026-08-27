import type { PlaceSnapshot } from "./PlaceSnapshot";

const KEY = "polyx-pending-place";

let memory: PlaceSnapshot | null = null;

/** Queue a HedronX map to load on the next PolyX play boot. */
export function queuePlaceForPlay(snap: PlaceSnapshot) {
  memory = snap;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

/** Take (and clear) the pending place, if any. */
export function takePendingPlace(): PlaceSnapshot | null {
  if (memory) {
    const s = memory;
    memory = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return s;
  }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PlaceSnapshot;
  } catch {
    return null;
  }
}

export function peekPendingPlace(): boolean {
  if (memory) return true;
  try {
    return sessionStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

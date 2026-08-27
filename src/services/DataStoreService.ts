/**
 * Local-first DataStore API (localStorage). Same shape as Roblox GetAsync/SetAsync
 * so games can later swap to a real backend without rewriting scripts.
 */
const PREFIX = "polyx-ds:";

function key(store: string, name: string) {
  return `${PREFIX}${store}:${name}`;
}

export class DataStore {
  constructor(private readonly storeName: string) {}

  async GetAsync(keyName: string): Promise<unknown> {
    try {
      const raw = localStorage.getItem(key(this.storeName, keyName));
      if (raw == null) return null;
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  async SetAsync(keyName: string, value: unknown): Promise<void> {
    localStorage.setItem(
      key(this.storeName, keyName),
      JSON.stringify(value ?? null),
    );
  }

  async UpdateAsync(
    keyName: string,
    transform: (old: unknown) => unknown,
  ): Promise<unknown> {
    const old = await this.GetAsync(keyName);
    const next = transform(old);
    await this.SetAsync(keyName, next);
    return next;
  }

  async RemoveAsync(keyName: string): Promise<unknown> {
    const old = await this.GetAsync(keyName);
    localStorage.removeItem(key(this.storeName, keyName));
    return old;
  }
}

export class DataStoreService {
  private readonly stores = new Map<string, DataStore>();

  GetDataStore(name: string): DataStore {
    let s = this.stores.get(name);
    if (!s) {
      s = new DataStore(name);
      this.stores.set(name, s);
    }
    return s;
  }
}

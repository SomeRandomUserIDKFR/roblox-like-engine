/** Lightweight Roblox-style signal (Connect / Fire / Wait). */
export type SignalConnection = { Disconnect: () => void };

export class Signal<T extends unknown[] = []> {
  private listeners = new Set<(...args: T) => void>();

  Connect(fn: (...args: T) => void): SignalConnection {
    this.listeners.add(fn);
    return {
      Disconnect: () => {
        this.listeners.delete(fn);
      },
    };
  }

  Once(fn: (...args: T) => void): SignalConnection {
    const conn = this.Connect((...args) => {
      conn.Disconnect();
      fn(...args);
    });
    return conn;
  }

  Fire(...args: T) {
    for (const fn of [...this.listeners]) {
      try {
        fn(...args);
      } catch (err) {
        console.error("[Signal]", err);
      }
    }
  }

  /** Promise that resolves on next Fire. */
  Wait(): Promise<T> {
    return new Promise((resolve) => {
      this.Once((...args) => resolve(args));
    });
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

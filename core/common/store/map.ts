// deno-lint-ignore-file require-await
import { StoreBase, StoreItem } from "./base.ts";

export const StoreMap = new Map<string, StoreItem>();

export class MapStore extends StoreBase {
  static _freeBytes?: number;

  static map = StoreMap;

  static isConnected() {
    return this.map instanceof Map;
  }

  static async connect() {
    // Do nothing...
  }

  static async disconnect() {
    // Do nothing...
  }

  static async set(
    key: string,
    value: unknown,
    options?: {
      expiresInMs?: number;
    },
  ) {
    const CurrentTime = Date.now();

    this.map.set(
      key,
      {
        __value: value,
        timestamp: CurrentTime,
        expiresInMs: options?.expiresInMs,
      } satisfies StoreItem,
    );

    // if (this.isCleanupRequired())
    this.cleanup();
  }

  private static _get(key: string): StoreItem | null {
    const Value = this.map.get(key) ?? null;

    if (this.isExpired(Value)) {
      this.map.delete(key);
      return null;
    }

    return Value;
  }

  static async get<T extends unknown>(key: string): Promise<T | null> {
    return (this._get(key)?.__value as T) ?? null;
  }

  static async del(...keys: string[]) {
    keys.forEach((key) => this.map!.delete(key));
  }

  static async has(key: string) {
    return this.map.has(key);
  }

  static async timestamp(key: string) {
    return this._get(key)?.timestamp ?? null;
  }

  static async incr(
    key: string,
    options?: {
      incrBy?: number;
      expiresInMs?: number;
    },
  ) {
    const RawValue = this._get(key);

    const Count = ((RawValue?.__value as number) ?? 0) + (options?.incrBy ?? 1);

    this.set(key, Count, options);

    return Count;
  }

  static throttle<T extends (...args: unknown[]) => unknown>(
    callback: T,
    ttlMs: number,
  ): T {
    let InitialExec = false;
    let ExecutionTime: number;
    let Value: unknown;

    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      const CurrentTime = Date.now();

      if (!InitialExec || CurrentTime - ExecutionTime >= ttlMs) {
        InitialExec = true;
        ExecutionTime = CurrentTime;

        Value = callback.bind(this)(...args);
      }

      return Value;
    } as T;
  }

  static usedMemoryPercentage = this.throttle(() => {
    const FreeBytes = Deno.systemMemoryInfo().free;
    const UsedBytes = Deno.memoryUsage().heapUsed;

    this._freeBytes ??= FreeBytes;

    const Percentage = (UsedBytes / this._freeBytes) * 100;

    return Percentage;
  }, 3000);

  static isCleanupRequired = () => this.usedMemoryPercentage() >= 30;

  static isExpired = (value?: StoreItem | null, timestamp = Date.now()) => {
    return (
      typeof value?.expiresInMs === "number" &&
      timestamp >= (value.timestamp ?? 0) + value.expiresInMs
    );
  };

  static cleanup = this.throttle(() => {
    const Timestamp = Date.now();

    for (const [Key, Value] of this.map) {
      if (this.isExpired(Value, Timestamp)) this.del(Key);
    }
  }, 30000);
}

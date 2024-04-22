// deno-lint-ignore-file require-await
import { StoreBase, StoreItem } from "./base.ts";

export const StoreMap = new Map<string, StoreItem>();

export class MapStore extends StoreBase {
  static map?: Map<string, StoreItem>;

  static isConnected() {
    return this.map instanceof Map;
  }

  static async connect() {
    this.map = StoreMap;
  }

  static async disconnect() {
    delete this.map;
  }

  static async set(
    key: string,
    value: unknown,
    options?: {
      expiresInMs?: number;
    },
  ) {
    if (!this.map) throw new Error(`Map not initialized!`);

    const CurrentTime = Date.now();

    this.map.set(
      key,
      {
        __value: value,
        timestamp: CurrentTime,
        expiresInMs: options?.expiresInMs,
      } satisfies StoreItem,
    );
  }

  private static _get(key: string): StoreItem | null {
    if (!this.map) throw new Error(`Map not initialized!`);

    const Value = this.map.get(key) ?? null;

    if (
      typeof Value?.expiresInMs === "number" &&
      Date.now() >= (Value.timestamp + Value.expiresInMs)
    ) {
      this.map.delete(key);
      return null;
    }

    return Value;
  }

  static async get<T extends unknown>(key: string): Promise<T | null> {
    return this._get(key)?.__value as T ?? null;
  }

  static async del(...keys: string[]) {
    if (!this.map) throw new Error(`Map not initialized!`);

    keys.forEach((key) => this.map!.delete(key));
  }

  static async has(key: string) {
    if (!this.map) throw new Error(`Map not initialized!`);

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

    const Count = ((RawValue?.__value as number) ?? 0) +
      (options?.incrBy ?? 1);

    this.set(key, Count, options);

    return Count;
  }
}

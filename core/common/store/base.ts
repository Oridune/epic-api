// deno-lint-ignore-file no-unused-vars require-await
import { Env } from "@Core/common/env.ts";
import DenoConfig from "../../../deno.json" with { type: "json" };

export interface StoreItem {
  __value: unknown;
  timestamp?: number;
  expiresInMs?: number;
}

export abstract class StoreLike {
  /**
   * Is store connected?
   * @returns
   */
  static isConnected(): void {
    throw new Error("Implementation required!");
  }

  /**
   * Connect to the store
   */
  static async connect(): Promise<void> {
    throw new Error("Implementation required!");
  }

  /**
   * Disconnect the store
   */
  static async disconnect(): Promise<void> {
    throw new Error("Implementation required!");
  }

  /**
   * Set a value in the store
   * @param key
   * @param value
   * @param options
   */
  static set(
    key: string,
    value: unknown,
    options?: {
      expiresInMs?: number;
    },
  ): Promise<void> {
    throw new Error("Implementation required!");
  }

  /**
   * Get a value from the store
   * @param key
   * @returns
   */
  static get<T extends unknown>(key: string): Promise<T | null> {
    throw new Error("Implementation required!");
  }

  /**
   * Delete the keys from store
   * @param keys
   */
  static del(...keys: string[]): Promise<void> {
    throw new Error("Implementation required!");
  }

  /**
   * Check if a key exists
   * @param key
   * @returns
   */
  static has(key: string): Promise<boolean> {
    throw new Error("Implementation required!");
  }

  /**
   * Get the created-on timestamp of a store value
   * @param key
   * @returns
   */
  static timestamp(key: string): Promise<number | null> {
    throw new Error("Implementation required!");
  }

  /**
   * Creates/Increments a number and returns it
   * @param key
   * @param options
   * @returns
   */
  static incr(
    key: string,
    options?: {
      incrBy?: number;
      expiresInMs?: number;
    },
  ): Promise<number> {
    throw new Error("Implementation required!");
  }
}

export class StoreBase extends StoreLike {
  protected static serialize(value: unknown, options?: {
    expiresInMs?: number;
  }) {
    const CurrentTime = Date.now();

    return JSON.stringify(
      {
        __value: value,
        timestamp: CurrentTime,
        expiresInMs: options?.expiresInMs,
      } satisfies StoreItem,
    );
  }

  protected static deserialize(value: unknown): StoreItem {
    if (typeof value === "string" && value) {
      try {
        const RawValue = JSON.parse(value);

        if (typeof RawValue === "object" && RawValue && "__value" in RawValue) {
          return RawValue as StoreItem;
        }
      } catch {
        // Do nothing...
      }
    }

    return { __value: value };
  }

  protected static resolveKey(key: string | string[]) {
    const KeyParts = key instanceof Array ? key : [key];
    return [DenoConfig.id, Env.getType(), "store", ...KeyParts].join(":");
  }

  /**
   * A utility method to cache any computed results and make the process faster.
   * @param key
   * @param callback
   * @param options Expiry in ms or an options object
   * @returns
   */
  static async cache<T>(
    key: string | string[],
    callback: () =>
      | T
      | { result: T; expiresInMs: number }
      | Promise<T | { result: T; expiresInMs: number }>,
    options?: number | {
      store?: typeof StoreLike;
      expiresInMs?: number;
    },
  ) {
    const Key = key instanceof Array ? key.join(":") : key;
    const Options = typeof options === "number"
      ? { expiresInMs: options }
      : options;
    const Store = Options?.store ?? this;

    const Cached = await Store.get<T>(Key);

    if (Cached !== null) return Cached;

    const RawValue = await callback();

    let Value: unknown = RawValue;
    let ExpiresInMs = Options?.expiresInMs;

    if (
      typeof RawValue === "object" &&
      RawValue &&
      "result" in RawValue &&
      "expiresInMs" in RawValue &&
      Object.keys(RawValue).length === 2
    ) {
      Value = RawValue.result;
      ExpiresInMs = RawValue.expiresInMs;
    }

    // deno-lint-ignore no-explicit-any
    if (![null, undefined].includes(Value as any)) {
      await Store.set(Key, Value, { expiresInMs: ExpiresInMs });
    }

    return Value as T;
  }
}

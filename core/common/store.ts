import { Env } from "./env.ts";
import { Redis } from "redis";

export enum StoreType {
  MAP = "map",
  REDIS = "redis",
  DENO_KV = "deno-kv",
}

export interface StoreItem {
  value: unknown;
  timestamp: number;
  expiresOnMs?: number;
}

export class Store {
  static type = Env.getSync("STORE_TYPE", true) ?? StoreType.MAP;
  static redisConnectionString = Env.getSync("REDIS_CONNECTION_STRING", true);
  static denoKvConnectionString = Env.getSync(
    "DENO_KV_CONNECTION_STRING",
    true,
  );
  static map = new Map<string, StoreItem>();
  static redis?: Redis;
  static denoKv?: Deno.Kv;

  private static serialize(value: unknown) {
    return JSON.stringify({ __value: value });
  }

  private static deserialize(value: unknown) {
    if (typeof value === "string" && value) {
      try {
        const RawValue = JSON.parse(value);
        if (typeof RawValue === "object" && RawValue && "__value" in RawValue) {
          return RawValue.__value;
        }
      } catch {
        // Do nothing...
      }
    }

    return value;
  }

  /**
   * Is caching server connected?
   * @returns
   */
  static isConnected() {
    switch (Store.type) {
      case StoreType.REDIS:
        return !!Store.redis && !["end", "close"].includes(Store.redis.status);

      case StoreType.DENO_KV:
        return Store.denoKv instanceof Deno.Kv;

      default:
        return false;
    }
  }

  /**
   * This method is called when attempted to connect to the caching server
   */
  static async connect() {
    switch (Store.type) {
      case StoreType.REDIS:
        if (!Store.redis && Store.redisConnectionString) {
          const { hostname, port, pathname, username, password } = new URL(
            Store.redisConnectionString.replace("redis://", "http://"),
          );

          Store.redis = new Redis({
            lazyConnect: true,
            host: hostname,
            port: parseInt(port),
            db: parseInt(pathname.split("/").filter(Boolean)[0]),
            username,
            password,
          });

          await Store.redis.connect();
        }
        break;

      case StoreType.DENO_KV:
        if (!(Store.denoKv instanceof Deno.Kv)) {
          Store.denoKv = await Deno.openKv(Store.denoKvConnectionString);
        }
        break;

      default:
        break;
    }
  }

  /**
   * Disconnect the caching server
   */
  static disconnect() {
    switch (Store.type) {
      case StoreType.REDIS:
        if (Store.redis && Store.isConnected()) {
          Store.redis.disconnect();
          delete Store.redis;
        }
        break;

      case StoreType.DENO_KV:
        if (Store.denoKv) {
          Store.denoKv.close();
          delete Store.denoKv;
        }
        break;

      default:
        break;
    }
  }

  /**
   * Set a value in the store
   * @param key
   * @param value
   * @param options
   */
  static async set(
    key: string,
    value: unknown,
    options?: { expiresInMs?: number },
  ) {
    switch (Store.type) {
      case StoreType.REDIS:
        if (!Store.redis) throw new Error(`No redis connection!`);

        await Promise.all([
          Store.redis.set(`${key}:timestamp`, Date.now()),
          Store.redis.set(key, Store.serialize(value)),
        ]);

        if (typeof options?.expiresInMs === "number") {
          const ExpiresIn = options.expiresInMs / 1000;
          await Promise.all([
            Store.redis.expire(`${key}:timestamp`, ExpiresIn),
            Store.redis.expire(key, ExpiresIn),
          ]);
        }
        break;

      case StoreType.DENO_KV:
        {
          if (!Store.denoKv) throw new Error(`Deno Kv is not connected!`);

          const CurrentTime = Date.now();
          await Store.denoKv.set(["store", key], {
            value,
            timestamp: CurrentTime,
            expiresOnMs: typeof options?.expiresInMs === "number"
              ? CurrentTime + options?.expiresInMs
              : undefined,
          });
        }
        break;

      default:
        {
          const CurrentTime = Date.now();
          Store.map.set(key, {
            value,
            timestamp: CurrentTime,
            expiresOnMs: typeof options?.expiresInMs === "number"
              ? CurrentTime + options?.expiresInMs
              : undefined,
          });
        }
        break;
    }
  }

  /**
   * Get a value from the store
   * @param key
   * @returns
   */
  static async get<T extends unknown>(key: string): Promise<T | null> {
    switch (Store.type) {
      case StoreType.REDIS:
        if (!Store.redis) throw new Error(`No redis connection!`);

        return (Store.deserialize(await Store.redis.get(key)) as T) ?? null;

      case StoreType.DENO_KV: {
        if (!Store.denoKv) throw new Error(`Deno Kv is not connected!`);

        const RawValue = (await Store.denoKv.get<StoreItem>(["store", key]))
          .value;

        if (
          typeof RawValue?.expiresOnMs === "number" &&
          Date.now() >= RawValue.expiresOnMs
        ) {
          Store.denoKv.delete(["store", key]);
          return null;
        }

        return (RawValue?.value as T) ?? null;
      }

      default: {
        const RawValue = Store.map.get(key);

        if (
          typeof RawValue?.expiresOnMs === "number" &&
          Date.now() >= RawValue.expiresOnMs
        ) {
          Store.map.delete(key);
          return null;
        }

        return (RawValue?.value as T) ?? null;
      }
    }
  }

  /**
   * Delete the keys from store
   * @param keys
   */
  static async del(...keys: string[]) {
    switch (Store.type) {
      case StoreType.REDIS:
        if (!Store.redis) throw new Error(`No redis connection!`);

        await Store.redis.del(
          ...keys,
          ...keys.map((key) => `${key}:timestamp`),
        );
        break;

      default:
        for (const Key of keys) Store.map.delete(Key);
        break;
    }
  }

  /**
   * Check if a key exists
   * @param key
   * @returns
   */
  static async has(key: string) {
    switch (Store.type) {
      case StoreType.REDIS:
        if (!Store.redis) throw new Error(`No redis connection!`);

        return !!(await Store.redis.exists(key));

      case StoreType.DENO_KV:
        if (!Store.denoKv) throw new Error(`Deno Kv is not connected!`);

        return !!(await Store.get(key));

      default:
        return Store.map.has(key);
    }
  }

  /**
   * Get the created-on timestamp of a store value
   * @param key
   * @returns
   */
  static async timestamp(key: string) {
    switch (Store.type) {
      case StoreType.REDIS: {
        if (!Store.redis) throw new Error(`No redis connection!`);

        const RawValue = await Store.redis.get(`${key}:timestamp`);
        return RawValue ? parseInt(RawValue) : null;
      }

      case StoreType.DENO_KV: {
        if (!Store.denoKv) throw new Error(`Deno Kv is not connected!`);

        const RawValue = (await Store.denoKv.get<StoreItem>(["store", key]))
          .value;
        return RawValue?.timestamp ?? null;
      }

      default:
        return Store.map.get(key)?.timestamp ?? null;
    }
  }

  /**
   * Creates/Increments a value and returns it
   * @param key
   * @param options
   * @returns
   */
  static async incr(
    key: string,
    options?: { incrBy?: number; expiresInMs?: number },
  ) {
    switch (Store.type) {
      case StoreType.REDIS: {
        if (!Store.redis) throw new Error(`No redis connection!`);

        const [, Count] = await Promise.all([
          Store.redis.set(`${key}:timestamp`, Date.now()),
          Store.redis.incrby(key, options?.incrBy ?? 1),
        ]);

        if (typeof options?.expiresInMs === "number") {
          const ExpiresIn = options.expiresInMs / 1000;
          await Promise.all([
            Store.redis.expire(`${key}:timestamp`, ExpiresIn),
            Store.redis.expire(key, ExpiresIn),
          ]);
        }

        return Count;
      }

      default: {
        const Count = ((await Store.get<number>(key)) ?? 0) + 1;

        await Store.set(key, Count, options);

        return Count;
      }
    }
  }

  /**
   * A utility method to cache any computed results and make the process faster.
   * @param key
   * @param callback
   * @param expiresInMs
   * @returns
   */
  static async cache<T>(
    key: string | string[],
    callback: () => T,
    expiresInMs?: number,
  ) {
    const Key = key instanceof Array ? key.join(":") : key;

    const Cached = await this.get<T>(Key);

    if (Cached !== null) return Cached;

    const Value = await callback();

    // deno-lint-ignore no-explicit-any
    if (![null, undefined].includes(Value as any)) {
      await this.set(Key, Value, { expiresInMs });
    }

    return Value;
  }
}

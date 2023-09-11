import { Env } from "@Core/common/env.ts";
import { Redis } from "redis";

export enum StoreType {
  MAP = "map",
  REDIS = "redis",
  DENO_KV = "deno-kv",
}

export class Store {
  static type = Env.getSync("STORE_TYPE", true) ?? StoreType.MAP;
  static redisConnectionString = Env.getSync("REDIS_CONNECTION_STRING", true);
  static map = new Map<
    string,
    {
      value: unknown;
      timestamp: number;
      expiresOnMs?: number;
    }
  >();
  static redis?: Redis;

  private static serialize(value: unknown) {
    return JSON.stringify({ __value: value });
  }

  private static deserialize(value: unknown) {
    if (typeof value === "string" && value)
      try {
        const RawValue = JSON.parse(value);
        if (typeof RawValue === "object" && RawValue && "__value" in RawValue)
          return RawValue.__value;
      } catch {
        // Do nothing...
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
            Store.redisConnectionString.replace("redis://", "http://")
          );

          Store.redis = new Redis({
            lazyConnect: true,
            host: hostname,
            port,
            db: parseInt(pathname.split("/").filter(Boolean)[0]),
            username,
            password,
          });

          await Store.redis.connect();
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
    options?: { expiresInMs?: number }
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

      default:
        {
          const CurrentTime = Date.now();
          Store.map.set(key, {
            value,
            timestamp: CurrentTime,
            expiresOnMs:
              typeof options?.expiresInMs === "number"
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

      default: {
        const RawValue = Store.map.get(key);

        if (
          typeof RawValue?.expiresOnMs === "number" &&
          Date.now() >= RawValue.expiresOnMs
        )
          return null;

        return (RawValue?.value as T) ?? null;
      }
    }
  }

  /**
   * Get a created-on timestamp of the value
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

      default:
        return Store.map.get(key)?.timestamp ?? null;
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

      default:
        return Store.map.has(key);
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
    options?: { incrBy?: number; expiresInMs?: number }
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

        await Store.set(key, Count);

        return Count;
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
          ...keys.map((key) => `${key}:timestamp`)
        );
        break;

      default:
        for (const Key of keys) Store.map.delete(Key);
        break;
    }
  }
}

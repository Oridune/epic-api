import { Env } from "@Core/common/env.ts";
import { Redis } from "redis";

const RedisConnectionString = Env.getSync("REDIS_CONNECTION_STRING", true);

export class Store {
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
    return !!Store.redis && !["end", "close"].includes(Store.redis.status);
  }

  /**
   * This method is called when attempted to connect to the caching server
   */
  static async connect() {
    if (!Store.redis && RedisConnectionString) {
      const { hostname, port, pathname, username, password } = new URL(
        RedisConnectionString.replace("redis://", "http://")
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
  }

  /**
   * Disconnect the caching server
   */
  static disconnect() {
    if (Store.redis && Store.isConnected()) Store.redis.disconnect();
    delete Store.redis;
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
    if (Store.redis) {
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
    } else {
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
  }

  /**
   * Get a value from the store
   * @param key
   * @returns
   */
  static async get<T extends unknown>(key: string): Promise<T | null> {
    if (Store.redis)
      return (Store.deserialize(await Store.redis.get(key)) as T) ?? null;

    const RawValue = Store.map.get(key);

    if (
      typeof RawValue?.expiresOnMs === "number" &&
      Date.now() >= RawValue.expiresOnMs
    )
      return null;

    return (RawValue?.value as T) ?? null;
  }

  /**
   * Get a created-on timestamp of the value
   * @param key
   * @returns
   */
  static async timestamp(key: string) {
    if (Store.redis) {
      const RawValue = await Store.redis.get(`${key}:timestamp`);
      return RawValue ? parseInt(RawValue) : null;
    }

    return Store.map.get(key)?.timestamp ?? null;
  }

  /**
   * Check if a key exists
   * @param key
   * @returns
   */
  static async has(key: string) {
    if (Store.redis) return !!(await Store.redis.exists(key));
    return Store.map.has(key);
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
    if (Store.redis) {
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

    const Count = ((await Store.get<number>(key)) ?? 0) + 1;

    await Store.set(key, Count);

    return Count;
  }

  /**
   * Delete the keys from store
   * @param keys
   */
  static async del(...keys: string[]) {
    if (Store.redis)
      await Store.redis.del(...keys, ...keys.map((key) => `${key}:timestamp`));
    else for (const Key of keys) Store.map.delete(Key);
  }
}

import { Env } from "../env.ts";
import { StoreBase, StoreItem } from "./base.ts";
import { Redis } from "redis";

export const urlToRedisOptions = (url: string) => {
  const { hostname, port, pathname, username, password } = new URL(
    url.replace("redis://", "http://"),
  );

  return {
    host: hostname,
    port: parseInt(port),
    db: parseInt(pathname.split("/").filter(Boolean)[0]),
    username,
    password,
  };
};

export class RedisStore extends StoreBase {
  static redisConnectionString = Env.getSync("REDIS_CONNECTION_STRING", true);

  static override isConnected() {
    return !!this.redis && !["end", "close"].includes(this.redis.status);
  }

  static override async connect() {
    if (!this.redis && this.redisConnectionString) {
      this.redis = new Redis({
        lazyConnect: true,
        ...urlToRedisOptions(this.redisConnectionString),
      });

      await this.redis.connect();
    }
  }

  static override async disconnect() {
    if (this.redis && this.isConnected()) await this.redis.disconnect();
    delete this.redis;
  }

  static override async set(
    key: string,
    value: unknown,
    options?: {
      expiresInMs?: number;
    },
  ) {
    if (!this.redis) throw new Error(`No redis connection!`);

    const Value = this.serialize(value, options);

    if (typeof options?.expiresInMs === "number") {
      await this.redis.setex(
        this.resolveKey(key),
        options.expiresInMs / 1000, // Convert to seconds
        Value,
      );
    } else await this.redis.set(this.resolveKey(key), Value);
  }

  private static async _get(key: string): Promise<StoreItem | null> {
    if (!this.redis) throw new Error(`No redis connection!`);

    return (this.deserialize(
      await this.redis.get(this.resolveKey(key)),
    ) as StoreItem) ??
      null;
  }

  static override async get<T extends unknown>(key: string): Promise<T | null> {
    return (await this._get(key))?.__value as T ?? null;
  }

  static override async del(...keys: string[]) {
    if (!this.redis) throw new Error(`No redis connection!`);

    await this.redis.del(...keys.map(this.resolveKey));
  }

  static override async has(key: string) {
    if (!this.redis) throw new Error(`No redis connection!`);

    return !!(await this.redis.exists(this.resolveKey(key)));
  }

  static override async timestamp(key: string) {
    return (await this._get(key))?.timestamp ?? null;
  }

  static override async incr(
    key: string,
    options?: {
      incrBy?: number;
      expiresInMs?: number;
    },
  ) {
    if (!this.redis) throw new Error(`No redis connection!`);

    const Key = this.resolveKey(key);
    const Count = await this.redis.incrby(
      Key,
      options?.incrBy ?? 1,
    );

    if (typeof options?.expiresInMs === "number") {
      await this.redis.expire(Key, options.expiresInMs / 1000);
    }

    return Count;
  }
}

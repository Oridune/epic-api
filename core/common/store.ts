import { Env } from "./env.ts";
import { MapStore } from "@Core/common/store/map.ts";
import { RedisStore } from "@Core/common/store/redis.ts";
import { DenoKvStore } from "@Core/common/store/denoKv.ts";
import { StoreBase } from "@Core/common/store/base.ts";

export enum StoreType {
  MAP = "map",
  REDIS = "redis",
  DENO_KV = "deno-kv",
}

export const CurrentStoreType = Env.getSync("STORE_TYPE", true) ??
  StoreType.MAP;

export const getStore = (type: string) => {
  switch (type) {
    case StoreType.MAP:
      return MapStore as unknown as typeof StoreBase;

    case StoreType.REDIS:
      return RedisStore as unknown as typeof StoreBase;

    case StoreType.DENO_KV:
      return DenoKvStore as unknown as typeof StoreBase;

    default:
      throw new Error(`Unexpected store type ${CurrentStoreType}!`);
  }
};

export class Store extends getStore(CurrentStoreType) {
  static type = CurrentStoreType;

  static switch(type: StoreType) {
    return getStore(type);
  }

  static async session<T>(
    type: StoreType,
    callback: (store: typeof StoreBase) => T,
  ): Promise<T> {
    const store = this.switch(type);

    let error: unknown;

    await store.connect();

    const results = callback(store);

    if (results instanceof Promise) {
      await results.catch((e) => {
        error = e;
      });
    }

    await store.disconnect();

    if (error !== undefined) throw error;

    return results;
  }
}

import { Env } from "../env.ts";
import { StoreBase, StoreItem } from "./base.ts";

export class DenoKvStore extends StoreBase {
  static denoKvConnectionString = Env.getSync(
    "DENO_KV_CONNECTION_STRING",
    true,
  );
  static denoKv?: Deno.Kv;

  static isConnected() {
    return this.denoKv instanceof Deno.Kv;
  }

  static async connect() {
    if (!(this.denoKv instanceof Deno.Kv)) {
      this.denoKv = await Deno.openKv(this.denoKvConnectionString);
    }
  }

  static async disconnect() {
    if (this.denoKv) await this.denoKv.close();
    delete this.denoKv;
  }

  static async set(
    key: string,
    value: unknown,
    options?: {
      expiresInMs?: number;
    },
  ) {
    if (!this.denoKv) throw new Error(`Deno Kv is not connected!`);

    await this.denoKv.set(
      [this.resolveKey(key)],
      {
        __value: value,
        timestamp: Date.now(),
        expiresInMs: options?.expiresInMs,
      } satisfies StoreItem,
      { expireIn: options?.expiresInMs },
    );
  }

  private static async _get(key: string): Promise<StoreItem | null> {
    if (!this.denoKv) throw new Error(`Deno Kv is not connected!`);

    return (await this.denoKv.get<StoreItem>([this.resolveKey(key)])).value;
  }

  static async get<T extends unknown>(key: string): Promise<T | null> {
    return (await this._get(key))?.__value as T ?? null;
  }

  static async del(...keys: string[]) {
    if (!this.denoKv) throw new Error(`Deno Kv is not connected!`);

    await Promise.all(
      keys.map((key) => this.denoKv!.delete([this.resolveKey(key)])),
    );
  }

  static async has(key: string) {
    return !!(await this.get(key));
  }

  static async timestamp(key: string) {
    return (await this._get(key))?.timestamp ?? null;
  }

  static async incr(
    key: string,
    options?: {
      incrBy?: number;
      expiresInMs?: number;
    },
  ) {
    if (!this.denoKv) throw new Error(`Deno Kv is not connected!`);

    const Value = await this.denoKv.get<StoreItem>([this.resolveKey(key)]);

    const Count = ((Value.value?.__value as number) ?? 0) +
      (options?.incrBy ?? 1);

    const NewValue = {
      __value: Count,
      timestamp: Value.value?.timestamp ?? Date.now(),
      expiresInMs: Value.value?.expiresInMs ?? options?.expiresInMs,
    } satisfies StoreItem;

    await this.denoKv.atomic().check(Value).set(
      [this.resolveKey(key)],
      NewValue,
      { expireIn: NewValue.expiresInMs },
    ).commit();

    return Count;
  }
}

// deno-lint-ignore-file no-explicit-any
import { Context, Status } from "oak";
import { GlobalRedisClient, Env, EnvType } from "@Core/common/mod.ts";

export type RateLimitOptions = {
  onRateLimit?: (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
    options: RateLimitOptions
  ) => Promise<unknown> | unknown;
  limit?: number | string;
  windowMs?: number | string;
};

export type RateLimitData = { timestamp: number; count: number };

export class RateLimitStore {
  static Store = GlobalRedisClient ?? new Map<string, RateLimitData>();

  static async inc(ip: string, windowMs: number): Promise<RateLimitData> {
    if (RateLimitStore.Store instanceof Map) {
      const ExistingData = RateLimitStore.Store.get(ip);
      const DefaultData = {
        timestamp: Date.now(),
        count: 0,
      };
      const Data = ExistingData ?? DefaultData;

      const IsExpired = Date.now() > Data.timestamp + windowMs;

      if (IsExpired) {
        RateLimitStore.Store.delete(ip);
        return DefaultData;
      }

      Data.count++;

      if (!ExistingData) RateLimitStore.Store.set(ip, Data);

      return Data;
    } else {
      const TimestampKey = `${Env.getType()}:rateLimiter:${ip}:timestamp`;
      const CountKey = `${Env.getType()}:rateLimiter:${ip}:count`;

      const ExistingData = await Promise.all([
        RateLimitStore.Store.get(TimestampKey),
        RateLimitStore.Store.incr(CountKey),
      ]);
      const RawTimestamp = ExistingData[0];
      const Timestamp = RawTimestamp ? parseInt(RawTimestamp) : Date.now();

      const IsExpired = Date.now() > Timestamp + windowMs;

      if (IsExpired) {
        await RateLimitStore.Store.del(TimestampKey, CountKey);
        return {
          timestamp: Date.now(),
          count: 0,
        };
      }

      if (!RawTimestamp) {
        RateLimitStore.Store.expire(CountKey, windowMs / 1000);
        RateLimitStore.Store.set(TimestampKey, Date.now(), {
          ex: windowMs / 1000,
        });
      }

      return {
        timestamp: Timestamp,
        count: ExistingData[1],
      };
    }
  }
}

export const rateLimiter = (options?: RateLimitOptions) => {
  const DefaultLimit = 50;
  const DefaultWindowMs = Env.is(EnvType.TEST) ? 50000 : 1000;

  const RawLimit = parseInt((options?.limit ?? DefaultLimit).toString());
  const RawWindowMs = parseInt(
    (options?.windowMs ?? DefaultWindowMs).toString()
  );

  const Limit = isNaN(RawLimit) ? DefaultLimit : RawLimit;
  const WindowMs = isNaN(RawWindowMs) ? DefaultWindowMs : RawWindowMs;

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>
  ) => {
    const { ip } = ctx.request;

    const LimitData = await RateLimitStore.inc(ip, WindowMs);

    const XRateLimitReset = Math.round(
      (LimitData.timestamp + WindowMs) / 1000
    ).toString();
    const XRateLimitLimit = Limit.toString();
    const XRateLimitRemaining = Math.max(
      Limit - LimitData.count - 1,
      0
    ).toString();
    const ErrorProps = {
      "X-Rate-Limit-Reset": XRateLimitReset,
      "X-Rate-Limit-Limit": XRateLimitLimit,
      "X-Rate-Limit-Remaining": XRateLimitRemaining,
    };

    if (LimitData.count >= Limit) {
      ctx.response.status = Status.TooManyRequests;

      if (typeof options?.onRateLimit === "function")
        await options.onRateLimit(ctx, next, {
          ...options,
          limit: Limit,
          windowMs: WindowMs,
        });
      else ctx.throw(Status.TooManyRequests, undefined, ErrorProps);
    } else
      await next().catch((error) => {
        Object.assign(error, ErrorProps);
        throw error;
      });

    ctx.response.headers.set("X-Rate-Limit-Reset", XRateLimitReset);
    ctx.response.headers.set("X-Rate-Limit-Limit", XRateLimitLimit);
    ctx.response.headers.set("X-Rate-Limit-Remaining", XRateLimitRemaining);
  };
};

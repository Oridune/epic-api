// deno-lint-ignore-file no-explicit-any
import { Context, Status } from "oak";
import { Env, EnvType, Store } from "@Core/common/mod.ts";

export type RateLimitOptions = {
  onRateLimit?: (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
    options: RateLimitOptions,
  ) => Promise<unknown> | unknown;
  limit?: number | string;
  windowMs?: number | string;
};

export const rateLimiter = (options?: RateLimitOptions) => {
  const DefaultLimit = 50;
  const DefaultWindowMs = Env.is(EnvType.TEST) ? 50000 : 1000;

  const RawLimit = parseInt((options?.limit ?? DefaultLimit).toString());
  const RawWindowMs = parseInt(
    (options?.windowMs ?? DefaultWindowMs).toString(),
  );

  const Limit = isNaN(RawLimit) ? DefaultLimit : RawLimit;
  const WindowMs = isNaN(RawWindowMs) ? DefaultWindowMs : RawWindowMs;

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
  ) => {
    const { ip } = ctx.request;

    const Count = await Store.incr(ip, { expiresInMs: WindowMs });
    const CountTimestamp = (await Store.timestamp(ip)) ?? Date.now();

    const XRateLimitReset = Math.round(
      (CountTimestamp + WindowMs) / 1000,
    ).toString();
    const XRateLimitLimit = Limit.toString();
    const XRateLimitRemaining = Math.max(Limit - Count - 1, 0).toString();
    const ErrorProps = {
      "X-Rate-Limit-Reset": XRateLimitReset,
      "X-Rate-Limit-Limit": XRateLimitLimit,
      "X-Rate-Limit-Remaining": XRateLimitRemaining,
    };

    if (Count >= Limit) {
      ctx.response.status = Status.TooManyRequests;

      if (typeof options?.onRateLimit === "function") {
        await options.onRateLimit(ctx, next, {
          ...options,
          limit: Limit,
          windowMs: WindowMs,
        });
      } else ctx.throw(Status.TooManyRequests, undefined, ErrorProps);
    } else {
      await next().catch((error: any) => {
        Object.assign(error, ErrorProps);
        throw error;
      });
    }

    ctx.response.headers.set("X-Rate-Limit-Reset", XRateLimitReset);
    ctx.response.headers.set("X-Rate-Limit-Limit", XRateLimitLimit);
    ctx.response.headers.set("X-Rate-Limit-Remaining", XRateLimitRemaining);
  };
};

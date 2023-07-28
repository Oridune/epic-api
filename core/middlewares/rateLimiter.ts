// deno-lint-ignore-file no-explicit-any
import { Context, Status } from "oak";

export type RateLimitOptions = {
  onRateLimit?: (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
    options: RateLimitOptions
  ) => Promise<unknown> | unknown;
  limit?: number | string;
  windowMs?: number | string;
};

export type RateLimitData = { resetOnMs: number; count: number };

export class RateLimitStore {
  static Store = new Map<string, RateLimitData>();

  static get(ip: string) {
    return RateLimitStore.Store.get(ip);
  }

  static set(ip: string, data: RateLimitData) {
    RateLimitStore.Store.set(ip, data);
  }

  static delete(ip: string) {
    RateLimitStore.Store.delete(ip);
  }
}

export const rateLimiter = (options?: RateLimitOptions) => {
  const Limit = parseInt((options?.limit ?? 50).toString());
  const WindowMs = parseInt((options?.windowMs ?? 1000).toString());

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>
  ) => {
    const { ip } = ctx.request;

    const CurrentTime = Date.now();
    const LimitData = RateLimitStore.get(ip) ?? {
      resetOnMs: CurrentTime + WindowMs,
      count: 0,
    };
    const ResetRequired = LimitData.resetOnMs <= CurrentTime;

    if (ResetRequired) RateLimitStore.delete(ip);
    else RateLimitStore.set(ip, { ...LimitData, count: LimitData.count + 1 });

    const XRateLimitReset = (LimitData.resetOnMs / 1000).toString();
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

    if (LimitData.count >= Limit && !ResetRequired) {
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

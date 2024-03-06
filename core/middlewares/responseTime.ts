// deno-lint-ignore-file no-explicit-any
import { Context } from "oak";

export const responseTime = () =>
async (
  ctx: Context<Record<string, any>, Record<string, any>>,
  next: () => Promise<unknown>,
) => {
  ctx.state._requestStartedAt = Date.now();

  await next();

  ctx.response.headers.set(
    "X-Response-Time",
    `${Date.now() - ctx.state._requestStartedAt}ms`,
  );
};

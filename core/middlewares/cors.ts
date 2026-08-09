// deno-lint-ignore-file no-explicit-any
import { Context } from "oak";

export const cors = () =>
async (
  ctx: Context<Record<string, any>, Record<string, any>>,
  next: () => Promise<unknown>,
) => {
  // Allow everything
  ctx.response.headers.set(
    "Access-Control-Allow-Origin",
    ctx.request.headers.get("Origin") ?? "*",
  );

  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );

  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Api-Version, X-Account-Id",
  );

  // Handle preflight requests
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  await next();
};

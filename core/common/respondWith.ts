// deno-lint-ignore-file no-explicit-any
import { Context } from "oak/context.ts";
import { RawResponse, Response } from "./response.ts";
import { Env } from "@Core/common/env.ts";

export const respondWith = (
  ctx: Context<Record<string, any>, Record<string, any>>,
  response: Response | RawResponse,
) => {
  if (response instanceof Response) {
    response.metrics({ respondInMs: Date.now() - ctx.state._requestStartedAt });
  }

  // Append headers
  response.getHeaders().forEach((v, k) => ctx.response.headers.append(k, v));

  // Set status code & body
  ctx.response.status = response.getStatusCode();
  ctx.response.body = response.getBody(
    ["1", undefined].includes(Env.getSync("TRANSLATE_RESPONSE_MESSAGES", true))
      ? { translator: ctx.t }
      : undefined,
  );
};

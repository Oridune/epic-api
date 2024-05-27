import { Context } from "oak";
import { RawResponse, Response } from "./response.ts";
import { Env } from "./env.ts";
import { Events } from "./events.ts";

export const respondWith = async (
  ctx: Context,
  res: Response | RawResponse,
) => {
  if (res instanceof Response) {
    res.metrics({
      respondInMs: Date.now() - ctx.state._requestStartedAt,
    });
  }

  // Append headers
  res.getHeaders().forEach((v, k) => ctx.response.headers.append(k, v));

  // Set status code & body
  ctx.response.status = res.getStatusCode();
  ctx.response.body = res.getBody(
    ["1", undefined].includes(Env.getSync("TRANSLATE_RESPONSE_MESSAGES", true))
      ? { translator: ctx.t }
      : undefined,
  );

  try {
    ctx.state._body = await ctx.request.body().value;
  } catch {
    // Do nothing...
  }

  Events.dispatch("response", { detail: { ctx, res } });
};

// deno-lint-ignore-file no-explicit-any
import { Context } from "oak";

export const requestId =
  () =>
  async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>
  ) => {
    const ID = crypto.randomUUID();
    ctx.state["X-Request-ID"] = ID;
    await next().catch((error) => {
      Object.assign(error, {
        "X-Request-ID": ID,
      });
      throw error;
    });
    ctx.response.headers.set("X-Request-ID", ID);
  };

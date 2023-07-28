// deno-lint-ignore-file no-explicit-any
import { send, Context } from "oak";
import { join } from "path";

export const serveStatic = (prefix: string, path: string) => {
  console.info(
    "Static:",
    "\t",
    prefix.toUpperCase(),
    "\t\t",
    `/${prefix}/`,
    "\t\t",
    path
  );

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>
  ) => {
    const Prefix = new RegExp(`^/${prefix}/?`);

    if (Prefix.test(ctx.request.url.pathname)) {
      const SendOptions = { root: join(path, "www"), index: "index.html" };
      await send(
        ctx,
        ctx.request.url.pathname.replace(Prefix, "/"),
        SendOptions
      ).catch(() => send(ctx, "/", SendOptions));
    } else await next();
  };
};

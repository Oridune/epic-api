// deno-lint-ignore-file no-explicit-any
import { send, Context } from "oak";
import { join } from "path";

export const serveStatic =
  (prefix: string, path: string) =>
  async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>
  ) => {
    const Prefix = new RegExp(`^/${prefix}/?`);

    if (Prefix.test(ctx.request.url.pathname)) {
      const File = ctx.request.url.pathname.replace(Prefix, "/");
      const Stat = await Deno.stat(File).catch(() => {});
      await send(ctx, Stat?.isFile ? File : "index.html", {
        root: join(path, "www"),
      });
    }

    await next();
  };

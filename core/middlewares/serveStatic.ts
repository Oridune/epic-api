// deno-lint-ignore-file no-explicit-any
import { send, Context, Status } from "oak";

export const serveStatic =
  (prefix: string, root: string) =>
  async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>
  ) => {
    const Prefix = new RegExp(`^/${prefix}/?`);

    if (Prefix.test(ctx.request.url.pathname)) {
      const IndexFile = "index.html";
      const SendOptions = { root, index: IndexFile };
      const FilePath = ctx.request.url.pathname.replace(Prefix, "/");

      await send(ctx, FilePath, SendOptions).catch(() =>
        send(ctx, "/", SendOptions).catch(() => {
          const IsNotFound = !["/", IndexFile].includes(FilePath);
          ctx.throw(
            IsNotFound ? Status.NotFound : Status.Forbidden,
            IsNotFound
              ? `File not found! Invalid path '${FilePath}'.`
              : undefined
          );
        })
      );
    } else await next();
  };

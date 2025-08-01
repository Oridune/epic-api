// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { existsSync } from "dfs";
import { Context, send, Status } from "oak";

export const serveStatic = (prefix: string, root: string) => {
  if (!existsSync(root)) {
    return async (
      _ctx: Context<Record<string, any>, Record<string, any>>,
      next: () => Promise<unknown>,
    ) => {
      await next();
    };
  }

  let IndexFile = "index.html";

  if (!existsSync(join(root, IndexFile))) {
    const WWWItems = Deno.readDirSync(root);

    for (const item of WWWItems) {
      if (/^index.*/.test(item.name)) {
        IndexFile = item.name;
        break;
      }
    }
  }

  const Prefix = new RegExp(`^/${prefix}/?`);

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
  ) => {
    if (Prefix.test(ctx.request.url.pathname)) {
      const SendOptions = { root, index: IndexFile };
      const FilePath = ctx.request.url.pathname.replace(Prefix, "/");

      await send(ctx, FilePath, SendOptions).catch(() =>
        // Resolve to index for react apps
        send(ctx, "/", SendOptions).catch(() => {
          const IsNotFound = !["/", IndexFile].includes(FilePath);

          ctx.throw(
            IsNotFound ? Status.NotFound : Status.Forbidden,
            IsNotFound
              ? `File not found! Invalid path '${FilePath}'.`
              : undefined,
          );
        })
      );
    } else await next();
  };
};

// deno-lint-ignore-file no-explicit-any
import {
  Env,
  EnvType,
  Events,
  IRequestContext,
  Loader,
  prepareFetch,
  respondWith,
  Response,
  Server,
  Store,
} from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";
import { Database } from "@Database";
import {
  Application as AppServer,
  Router as AppRouter,
  RouterContext,
  Status,
} from "oak";
import { join } from "path";
import { ApplicationListenEvent } from "oak/application.ts";
import Logger from "oak:logger";
import { CORS } from "oak:cors";
import { gzip } from "oak:compress";

import { responseTime } from "@Core/middlewares/responseTime.ts";
import { useTranslator } from "@Core/middlewares/useTranslator.ts";
import { errorHandler } from "@Core/middlewares/errorHandler.ts";
import { serveStatic } from "@Core/middlewares/serveStatic.ts";
import { requestId } from "@Core/middlewares/requestId.ts";
import { rateLimiter } from "@Core/middlewares/rateLimiter.ts";

export const prepareAppServer = async (app: AppServer, router: AppRouter) => {
  app.use(responseTime());

  if (!Env.is(EnvType.PRODUCTION)) app.use(Logger.logger);

  app.use(await useTranslator());
  app.use(errorHandler());
  app.use(gzip());
  app.use(CORS());
  app.use(
    rateLimiter({
      limit: await Env.get("RATE_LIMITER_LIMIT", true),
      windowMs: await Env.get("RATE_LIMITER_WINDOW_MS", true),
    }),
  );
  app.use(requestId());

  const UITableData: Array<{
    Type: string;
    UI: string;
    Endpoint: string;
    Root: string;
  }> = [];

  const ServeStatic = (details: { name: string; path: string }) => {
    const Root = join(details.path, "www");

    UITableData.push({
      Type: "Static",
      UI: details.name.toUpperCase(),
      Endpoint: `/${details.name}/`,
      Root: Root.replace(Deno.cwd(), "").replace(/\\/g, "/"),
    });

    app.use(serveStatic(details.name, Root));
  };

  for (const [, SubLoader] of Loader.getLoaders() ?? []) {
    for (
      const [, UI] of SubLoader.tree
        .get("public")
        ?.sequence.listDetailed() ?? []
    ) {
      if (UI.enabled) ServeStatic(UI);
    }
  }

  for (const [, UI] of Loader.getSequence("public")?.listDetailed() ?? []) {
    if (UI.enabled) ServeStatic(UI);
  }

  // Log UI list
  if (UITableData.length) console.table(UITableData);

  for (const [, SubLoader] of Loader.getLoaders() ?? []) {
    for (
      const [, Middleware] of SubLoader.tree.get("middlewares")?.modules ??
        []
    ) {
      const Module = await Middleware.import();

      if (typeof Module.default === "function") {
        app.use(await Module.default());
      }
    }
  }

  for (const [, Middleware] of Loader.getModules("middlewares") ?? []) {
    const Module = await Middleware.import();

    if (typeof Module.default === "function") {
      app.use(await Module.default());
    }
  }

  await new Server(APIController).prepare(async (routes) => {
    const Hooks: Array<{
      pre?: (...args: any[]) => Promise<void>;
      post?: (...args: any[]) => Promise<void>;
    }> = [];

    for (const [, SubLoader] of Loader.getLoaders() ?? []) {
      for (const [, Hook] of SubLoader.tree.get("hooks")?.modules ?? []) {
        const Module = await Hook.import();

        if (typeof Module.default === "object") {
          Hooks.push(Module.default);
        }
      }
    }

    for (const [, Hook] of Loader.getModules("hooks") ?? []) {
      const Module = await Hook.import();

      if (typeof Module.default === "object") {
        Hooks.push(Module.default);
      }
    }

    const RoutesTableData: Array<{
      Type: string;
      Method: string;
      Permission: string;
      Endpoint: string;
    }> = [];

    for (const Route of routes) {
      RoutesTableData.push({
        Type: "Endpoint",
        Method: Route.options.method.toUpperCase(),
        Permission: `${Route.scope}.${Route.options.name}`,
        Endpoint: Route.endpoint,
      });

      const ControllerOptions = Route.options.controller.getOptions();
      const Middlewares = [
        ...(typeof ControllerOptions?.middlewares === "function"
          ? await ControllerOptions.middlewares()
          : ControllerOptions?.middlewares ?? []),

        ...(typeof Route.options.middlewares === "function"
          ? await Route.options.middlewares()
          : Route.options.middlewares ?? []),
      ];

      router[Route.options.method as "get"](
        Route.endpoint,
        async (ctx, next) => {
          ctx.state._requestScope = Route.scope;
          ctx.state._requestName = Route.options.name;

          await next();
        },
        ...Middlewares,
        async (ctx) => {
          const TargetVersion = ctx.request.headers.get("x-app-version") ??
            "latest";

          const RequestContext: IRequestContext<RouterContext<string>> = {
            requestedVersion: TargetVersion,
            version: TargetVersion,
            id: ctx.state._requestId,
            router: ctx as any,
            options: Route.options,
          };

          for (const Hook of Hooks) {
            await Hook.pre?.(Route.scope, Route.options.name, RequestContext);
          }

          const { version, object: RequestHandler } =
            (await Route.options.buildRequestHandler(Route, {
              version: RequestContext.version,
            })) ?? {};

          RequestContext.version = version ?? RequestContext.version;

          ctx.state._handleStartedAt = Date.now();

          const ReturnedResponse = await RequestHandler?.handler.bind(
            RequestHandler,
          )(RequestContext);

          if (ReturnedResponse instanceof Response) {
            ReturnedResponse.metrics({
              handledInMs: Date.now() - ctx.state._handleStartedAt,
            });
          }

          for (const Hook of Hooks) {
            await Hook?.post?.(Route.scope, Route.options.name, {
              ctx: RequestContext,
              res: ReturnedResponse,
            });
          }

          Events.dispatchRequestEvent(`${Route.scope}.${Route.options.name}`, {
            ctx: RequestContext,
            res: ReturnedResponse,
          });

          if (ReturnedResponse) await respondWith(ctx, ReturnedResponse);
        },
      );
    }

    // Log routes list
    if (RoutesTableData.length) console.table(RoutesTableData);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use((ctx) => ctx.throw(Status.NotFound));
};

type TBackgroundJob = (app: AppServer) => Promise<() => Promise<void>>;

export const loadBackgroundJobs = async () => {
  const PreJobs: Array<TBackgroundJob> = [];
  const PostJobs: Array<TBackgroundJob> = [];

  for (const [, SubLoader] of Loader.getLoaders() ?? []) {
    for (const [, Job] of SubLoader.tree.get("jobs")?.modules ?? []) {
      const Module = await Job.import();

      if (typeof Module.default === "function") {
        PostJobs.push(Module.default);
      }

      if (typeof Module.default === "object") {
        if (typeof Module.default.pre === "function") {
          PreJobs.push(Module.default.pre);
        }

        if (typeof Module.default.post === "function") {
          PostJobs.push(Module.default.post);
        }
      }
    }
  }

  for (const [, Job] of Loader.getModules("jobs") ?? []) {
    const Module = await Job.import();

    if (typeof Module.default === "function") {
      PostJobs.push(Module.default);
    }

    if (typeof Module.default === "object") {
      if (typeof Module.default.pre === "function") {
        PreJobs.push(Module.default.pre);
      }

      if (typeof Module.default.post === "function") {
        PostJobs.push(Module.default.post);
      }
    }
  }

  return {
    execPreJobs: async (app: AppServer) =>
      (await Promise.all(PreJobs.map((_) => _(app)))).filter(
        (_) => typeof _ === "function",
      ),
    execPostJobs: async (app: AppServer) =>
      (await Promise.all(PostJobs.map((_) => _(app)))).filter(
        (_) => typeof _ === "function",
      ),
  };
};

export const createAppServer = () => {
  const Context = {
    app: undefined as AppServer | undefined,
    router: undefined as AppRouter | undefined,
    jobCleanups: [] as Array<() => any>,
    abortController: undefined as AbortController | undefined,
  };

  const StartServer = () =>
    new Promise<ApplicationListenEvent>((resolve) => {
      (async () => {
        await Store.connect();
        await Database.connect();

        const { execPreJobs, execPostJobs } = await loadBackgroundJobs();

        Context.app = new AppServer();
        Context.router = new AppRouter();
        Context.abortController = new AbortController();

        Context.jobCleanups.push(...(await execPreJobs(Context.app)));

        await prepareAppServer(Context.app, Context.router);

        Context.jobCleanups.push(...(await execPostJobs(Context.app)));

        const listenHandler = (e: ApplicationListenEvent) => {
          console.info(
            `${Env.getType().toUpperCase()} Server is listening on Port: ${e.port}`,
          );

          Context.app!.removeEventListener("listen", listenHandler as any);

          resolve(e);
        };

        Context.app.addEventListener("listen", listenHandler);

        Context.app.listen({
          port: parseInt(Env.getSync("PORT", true) || "3742"),
          signal: Context.abortController.signal,
        });
      })();
    });

  const EndServer = async () => {
    Context.abortController!.abort();

    try {
      await Promise.all(Context.jobCleanups.map((_) => _()));
      await Database.disconnect();
      await Store.disconnect();
    } catch (error) {
      console.error(error);
    }

    console.info("Server terminated successfully!");
  };

  const RestartServer = async () => {
    console.info("Restarting Server...");

    await EndServer();

    return await StartServer();
  };

  return {
    getApp: () => Context.app,
    fetch: prepareFetch(Context as any),
    start: StartServer,
    end: EndServer,
    restart: RestartServer,
  };
};

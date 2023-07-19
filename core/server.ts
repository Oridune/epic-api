// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import {
  RawResponse,
  Response,
  Server,
  Env,
  EnvType,
  Loader,
} from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";
import { Database } from "../database.ts";
import {
  Application as AppServer,
  Router as AppRouter,
  RouterContext,
  isHttpError,
  send,
  Context,
} from "oak";
import StaticFiles from "oak:static";
import Logger from "oak:logger";
import { CORS } from "oak:cors";
import { gzip } from "oak:compress";
import { RateLimiter } from "oak:limiter";
import { ValidationException } from "validator";

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

export const prepareAppServer = async () => {
  const App = new AppServer();
  const Router = new AppRouter();

  App.use(Logger.logger);
  App.use(Logger.responseTime);
  App.use(gzip());
  App.use(CORS());
  App.use(await RateLimiter());
  App.use(async (ctx, next) => {
    const ID = crypto.randomUUID();
    ctx.state["X-Request-ID"] = ID;
    await next();
    ctx.response.headers.set("X-Request-ID", ID);
  });

  for (const [, SubLoader] of Loader.getLoaders() ?? [])
    for await (const UI of SubLoader.tree
      .get("public")
      ?.sequence.listDetailed() ?? [])
      if (UI.enabled) App.use(serveStatic(UI.name, UI.path));

  for await (const UI of Loader.getSequence("public")?.listDetailed() ?? [])
    if (UI.enabled) App.use(serveStatic(UI.name, UI.path));

  App.use(async (ctx, next) => {
    try {
      await next();
    } catch (e) {
      const NewResponse = Response.statusCode(
        isHttpError(e) ? e.status : e instanceof ValidationException ? 400 : 500
      ).messages(e.issues ?? [{ message: e.message }]);

      ctx.response.status = NewResponse.getStatusCode();
      ctx.response.headers = NewResponse.getHeaders();
      ctx.response.body = NewResponse.getBody();
    }
  });

  for (const [, SubLoader] of Loader.getLoaders() ?? [])
    for (const [, Middleware] of SubLoader.tree.get("middlewares")?.modules ??
      [])
      if (typeof Middleware.object.default === "function")
        App.use(await Middleware.object.default());

  for (const [, Middleware] of Loader.getModules("middlewares") ?? [])
    if (typeof Middleware.object.default === "function")
      App.use(await Middleware.object.default());

  await new Server(APIController).prepare(async (routes) => {
    const Hooks: Array<{
      pre?: (...args: any[]) => Promise<void>;
      post?: (...args: any[]) => Promise<void>;
    }> = [];

    for (const [, SubLoader] of Loader.getLoaders() ?? [])
      for (const [, Hook] of SubLoader.tree.get("hooks")?.modules ?? [])
        if (typeof Hook.object.default === "object")
          Hooks.push(Hook.object.default);

    for (const [, Hook] of Loader.getModules("hooks") ?? [])
      if (typeof Hook.object.default === "object")
        Hooks.push(Hook.object.default);

    for (const Route of routes) {
      if (!Env.is(EnvType.PRODUCTION))
        console.info(
          "Endpoint:",
          Route.options.method.toUpperCase(),
          "\t\t",
          Route.endpoint
        );

      const ControllerOptions = Route.options.controller.getOptions();
      const Middlewares = [
        ...(typeof ControllerOptions?.middlewares === "function"
          ? await ControllerOptions.middlewares()
          : ControllerOptions?.middlewares ?? []),

        ...(typeof Route.options.middlewares === "function"
          ? await Route.options.middlewares()
          : Route.options.middlewares ?? []),
      ];

      Router[Route.options.method as "get"](
        Route.endpoint,
        async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
          ctx.state.requestId = ctx.state["X-Request-ID"];
          ctx.state.requestName = Route.options.name;

          await next();
        },
        ...Middlewares,
        async (ctx: RouterContext<string>) => {
          const TargetVersion =
            ctx.request.headers.get("x-app-version") ?? "latest";
          const RequestContext = {
            requestedVersion: TargetVersion,
            version: TargetVersion,
            id: ctx.state.requestId,
            router: ctx,
            options: Route.options,
          };

          for (const Hook of Hooks)
            await Hook.pre?.(Route.scope, Route.options.name, RequestContext);

          const { version, object: RequestHandler } =
            (await Route.options.buildRequestHandler(Route, {
              version: RequestContext.version,
            })) ?? {};

          RequestContext.version = version ?? RequestContext.version;

          const ReturnedResponse = await RequestHandler?.handler.bind(
            RequestHandler
          )(RequestContext);

          for (const Hook of Hooks)
            await Hook?.post?.(Route.scope, Route.options.name, {
              ctx: RequestContext,
              res: ReturnedResponse,
            });

          dispatchEvent(
            new CustomEvent(ctx.state.requestName, {
              detail: {
                ctx: RequestContext,
                res: ReturnedResponse,
              },
            })
          );

          if (
            ReturnedResponse instanceof RawResponse ||
            ReturnedResponse instanceof Response
          ) {
            ctx.response.status = ReturnedResponse.getStatusCode();
            ctx.response.headers = ReturnedResponse.getHeaders();
            ctx.response.body = ReturnedResponse.getBody();
          }
        }
      );
    }
  });

  App.use(Router.routes());
  App.use(Router.allowedMethods());

  return App;
};

export const startBackgroundJobs = async (app: AppServer) => {
  const Jobs: Array<(app: AppServer) => Promise<() => Promise<void>>> = [];

  for (const [, SubLoader] of Loader.getLoaders() ?? [])
    for (const [, Job] of SubLoader.tree.get("jobs")?.modules ?? [])
      if (typeof Job.object.default === "function")
        Jobs.push(Job.object.default);

  for (const [, Job] of Loader.getModules("jobs") ?? [])
    if (typeof Job.object.default === "function") Jobs.push(Job.object.default);

  return (await Promise.all(Jobs.map((_) => _(app)))).filter(
    (_) => typeof _ === "function"
  );
};

export const startAppServer = async () => {
  const App = await prepareAppServer();

  await Database.connect();

  const JobCleanups = await startBackgroundJobs(App);

  const Controller = new AbortController();

  return {
    app: App,
    signal: Controller.signal,
    end: async () => {
      Controller.abort();

      await Promise.all(JobCleanups.map((_) => _()));
      await Database.disconnect();

      console.info("Application terminated successfully!");
    },
  };
};

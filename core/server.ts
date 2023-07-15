// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import {
  RawResponse,
  Response,
  Server,
  Env,
  EnvType,
} from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";
import { Database } from "../database.ts";
import Manager from "@Core/common/manager.ts";
import {
  Application as AppServer,
  Router as AppRouter,
  RouterContext,
  isHttpError,
} from "oak";
import StaticFiles from "oak:static";
import Logger from "oak:logger";
import { CORS } from "oak:cors";
import { gzip } from "oak:compress";
import { RateLimiter } from "oak:limiter";
import { ValidationException } from "validator";

export const App = new AppServer();
export const Router = new AppRouter();

export const prepareAppServer = async (app: AppServer) => {
  for (const Plugin of await Manager.getActivePlugins())
    for await (const Entry of Deno.readDir(join(Plugin.CWD, "public")))
      if (Entry.isDirectory)
        app.use(
          StaticFiles(join(Plugin.CWD, "public", Entry.name, "www"), {
            prefix: "/" + Entry.name,
            errorFile: true,
          })
        );

  for await (const Entry of Deno.readDir("public"))
    if (Entry.isDirectory)
      app.use(
        StaticFiles(join(Deno.cwd(), "public", Entry.name, "www"), {
          prefix: "/" + Entry.name,
          errorFile: true,
        })
      );

  app.use(Logger.logger);
  app.use(Logger.responseTime);
  app.use(CORS());
  app.use(gzip());
  app.use(await RateLimiter());
  app.use(async (ctx, next) => {
    const ID = crypto.randomUUID();
    ctx.state["X-Request-ID"] = ID;
    await next();
    ctx.response.headers.set("X-Request-ID", ID);
  });

  app.use(async (ctx, next) => {
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

  await Promise.all(
    [
      ...(await (
        await Manager.getActivePlugins()
      ).reduce<Promise<any[]>>(
        async (list, manager) => [
          ...(await list),
          ...(await manager.getModules("middlewares")),
        ],
        Promise.resolve([])
      )),
      ...(await Manager.getModules("middlewares")),
    ].map(async (middleware) => {
      if (typeof middleware === "function") app.use(await middleware());
    })
  );

  await new Server(APIController).prepare(async (routes) => {
    const Hooks = await Promise.all<
      | {
          pre?: (...args: any[]) => Promise<void>;
          post?: (...args: any[]) => Promise<void>;
        }
      | undefined
    >([
      ...(await (
        await Manager.getActivePlugins()
      ).reduce<Promise<any[]>>(
        async (list, manager) => [
          ...(await list),
          ...(await manager.getModules("hooks")),
        ],
        Promise.resolve([])
      )),
      ...(await Manager.getModules("hooks")),
    ]);

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
            await Hook?.pre?.(Route.scope, Route.options.name, RequestContext);

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

  app.use(Router.routes());
  app.use(Router.allowedMethods());

  return app;
};

export const startBackgroundJobs = async (app: AppServer) =>
  (
    await Promise.all<Promise<() => Promise<void>>[]>(
      [
        ...(await (
          await Manager.getActivePlugins()
        ).reduce<Promise<any[]>>(
          async (list, manager) => [
            ...(await list),
            ...(await manager.getModules("jobs")),
          ],
          Promise.resolve([])
        )),
        ...(await Manager.getModules("jobs")),
      ].map(async (job) => {
        if (typeof job === "function") return await job(app);
      })
    )
  ).filter((_) => typeof _ === "function");

export const startAppServer = async (app: AppServer) => {
  await prepareAppServer(app);

  await Database.connect();

  const JobCleanups = await startBackgroundJobs(app);

  const Controller = new AbortController();

  return {
    signal: Controller.signal,
    end: async () => {
      Controller.abort();

      await Promise.all(JobCleanups.map((_) => _()));
      await Database.disconnect();

      console.info("Application terminated successfully!");
    },
  };
};

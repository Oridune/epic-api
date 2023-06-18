// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { Response, ApiServer, Env, EnvType } from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";
import { connectDatabase } from "@Core/database.ts";
import { semverResolve } from "@Core/common/semver.ts";
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

export const Port = parseInt((await Env.get("PORT")) || "8080");
export const App = new AppServer();
export const Router = new AppRouter();

export const prepareAppServer = async (app: AppServer) => {
  await connectDatabase();

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
      ctx.response.status = isHttpError(e)
        ? e.status
        : e instanceof ValidationException
        ? 400
        : 500;
      ctx.response.body = Response.statusCode(ctx.response.status)
        .messages(e.issues ?? [{ message: e.message }])
        .toObject();
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

  await new ApiServer(APIController).prepare(async (routes) => {
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

          if (typeof RequestHandler === "object") {
            RequestContext.version = version ?? TargetVersion;
            const Result = await RequestHandler.handler.bind(RequestHandler)(
              RequestContext
            );

            for (const Hook of Hooks)
              await Hook?.post?.(Route.scope, Route.options.name, {
                ctx: RequestContext,
                res: Result,
              });

            dispatchEvent(
              new CustomEvent(ctx.state.requestName, {
                detail: {
                  ctx: RequestContext,
                  res: Result,
                },
              })
            );

            ctx.response.body = (
              Result instanceof Response ? Result : Response.status(true)
            ).toObject();
          } else {
            ctx.response.status = 404;
            ctx.response.body = Response.statusCode(ctx.response.status)
              .message("Route not found!")
              .toObject();
          }
        }
      );
    }
  });

  app.use(Router.routes());
  app.use(Router.allowedMethods());

  return app;
};

export const startBackgroundJobs = async () =>
  Promise.all(
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
      if (typeof job === "function") await job();
    })
  );

if (import.meta.main) {
  App.addEventListener("listen", ({ port }) =>
    console.info(`Server is listening on Port: ${port}`)
  );

  await prepareAppServer(App);
  await startBackgroundJobs();

  await App.listen({ port: Port });
}

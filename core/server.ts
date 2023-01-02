// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { Response, ApiServer, Env, EnvType } from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";
import { connectDatabase } from "@Core/database.ts";
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
import { requestIdMiddleware, getRequestIdKey } from "oak:requestId";
import { ValidationException } from "validator";

export const Port = parseInt(Env.get("PORT") || "8080");
export const App = new AppServer();
export const Router = new AppRouter();

if (import.meta.main) {
  await connectDatabase();

  for (const Plugin of await Manager.getPlugins())
    for await (const Entry of Deno.readDir(join(Plugin.CWD, "public")))
      if (Entry.isDirectory)
        App.use(
          StaticFiles(join(Plugin.CWD, "public", Entry.name, "www"), {
            prefix: "/" + Entry.name,
            errorFile: true,
          })
        );

  for await (const Entry of Deno.readDir("public"))
    if (Entry.isDirectory)
      App.use(
        StaticFiles(join(Deno.cwd(), "public", Entry.name, "www"), {
          prefix: "/" + Entry.name,
          errorFile: true,
        })
      );

  App.use(Logger.logger);
  App.use(Logger.responseTime);
  App.use(CORS());
  App.use(gzip());
  App.use(await RateLimiter());
  App.use(requestIdMiddleware);

  App.use(async (ctx, next) => {
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
        await Manager.getPlugins()
      ).reduce<Promise<any[]>>(
        async (list, manager) => [
          ...(await list),
          ...(await manager.getModules("middlewares")),
        ],
        Promise.resolve([])
      )),
      ...(await Manager.getModules("middlewares")),
    ].map(async (middleware) => {
      if (typeof middleware === "function") App.use(await middleware());
    })
  );

  await new ApiServer(APIController).create(async (routes) => {
    for (const Route of routes) {
      if (!Env.is(EnvType.PRODUCTION))
        console.info(
          "Endpoint:",
          Route.options.method.toUpperCase(),
          "\t",
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
          ctx.state.requestId = ctx.state[getRequestIdKey()];
          ctx.state.requestName = Route.options.name;

          await next();
        },
        ...Middlewares,
        async (ctx: RouterContext<string>) => {
          const RequestContext = {
            id: ctx.state.requestId,
            router: ctx,
            options: Route.options,
          };

          const Result = await Route.options.requestHandler(RequestContext);

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
        }
      );
    }
  });

  App.use(Router.routes());
  App.use(Router.allowedMethods());

  App.addEventListener("listen", () => {
    console.info(`Server is listening on Port: ${Port}`);
  });

  await Promise.all(
    [
      ...(await (
        await Manager.getPlugins()
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

  await App.listen({ port: Port });
}

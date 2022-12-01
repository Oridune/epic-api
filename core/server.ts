import { Response, ApiServer } from "@Core/common/mod.ts";
import { Env } from "@Core/env.ts";
import { MainController } from "@Core/controller.ts";
import {
  Application as AppServer,
  Router as AppRouter,
  RouterContext,
  isHttpError,
} from "deno:oak";
import Logger from "deno:oak:logger";
import { RateLimiter } from "deno:oak:limiter";
import { CORS } from "deno:oak:cors";
import { gzip } from "deno:oak:compress";
import { requestIdMiddleware, getRequestIdKey } from "deno:oak:requestId";
import { Manager } from "@Core/common/manager.ts";

export const Port = parseInt(Env.get("PORT") || "8080");
export const App = new AppServer();
export const Router = new AppRouter();

if (import.meta.main) {
  App.use(Logger.logger);
  App.use(Logger.responseTime);
  App.use(await RateLimiter());
  App.use(CORS());
  App.use(gzip());
  App.use(requestIdMiddleware);

  App.use(async (ctx, next) => {
    try {
      await next();
    } catch (e) {
      ctx.response.status = isHttpError(e) ? e.status : 500;
      ctx.response.body = Response.statusCode(ctx.response.status)
        .message(e.message)
        .toObject();
    }
  });

  await Promise.all(
    (
      await Manager.load("middlewares")
    ).map(async (middleware) => {
      if (typeof middleware === "function") App.use(await middleware());
    })
  );

  await new ApiServer(MainController).create((routes) =>
    routes.forEach((route) => {
      console.info(
        "Route Added:",
        route.options.method.toUpperCase(),
        "\t",
        route.endpoint
      );

      Router[route.options.method as "get"](
        route.endpoint,
        async (ctx: RouterContext<string>) => {
          const Result = await route.options.requestHandler({
            id: ctx.state[getRequestIdKey()],
            router: ctx,
            options: route.options,
          });

          ctx.response.body = (
            Result instanceof Response ? Result : Response.status(true)
          ).toObject();
        }
      );
    })
  );

  App.use(Router.routes());
  App.use(Router.allowedMethods());

  App.addEventListener("listen", () => {
    console.info(`Server is listening on Port: ${Port}`);
  });

  await Promise.all(
    (
      await Manager.load("jobs")
    ).map(async (job) => {
      if (typeof job === "function") await job();
    })
  );

  await App.listen({ port: Port });
}

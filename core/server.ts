import { Response, ApiServer, Manager, Env } from "@Core/common/mod.ts";
import { MainController } from "@Core/controller.ts";
import { connectDatabase } from "@Core/database.ts";
import {
  Application as AppServer,
  Router as AppRouter,
  RouterContext,
  isHttpError,
} from "oak";
import Logger from "oak:logger";
import { RateLimiter } from "oak:limiter";
import { CORS } from "oak:cors";
import { gzip } from "oak:compress";
import { requestIdMiddleware, getRequestIdKey } from "oak:requestId";

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
        .messages(e.issues ?? [{ message: e.message }])
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

  await connectDatabase();
  await App.listen({ port: Port });
}

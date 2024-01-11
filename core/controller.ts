// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  Loader,
  Controller,
  BaseController,
  Get,
  Versioned,
  Response,
  Store,
  Env,
} from "@Core/common/mod.ts";
import { Database } from "@Database";

@Controller("/api/", {
  name: "api",
  childs: () => {
    const Controllers: Array<typeof BaseController> = [];

    for (const [, SubLoader] of Loader.getLoaders() ?? [])
      for (const [, Controller] of SubLoader.tree.get("controllers")?.modules ??
        [])
        if (typeof Controller.object.default === "function")
          Controllers.push(Controller.object.default);

    for (const [, Controller] of Loader.getModules("controllers") ?? [])
      if (typeof Controller.object.default === "function")
        Controllers.push(Controller.object.default);

    return Controllers;
  },
})
export class APIController extends BaseController {
  @Get("/")
  public home() {
    return () => {
      return Response.message("Hurry! The API is online!").data({
        environment: Env.getType(),
        database: {
          connected: Database.isConnected(),
        },
        store: {
          type: Store.type,
          connected: Store.isConnected(),
        },
      });
    };
  }

  @Get("/test/")
  public async test() {
    // Simulate some slow task...
    await new Promise((_) => setTimeout(_, 3000));

    return new Versioned()
      .add(["0.0.1", "1.0.0"], {
        handler: ({ version }: { version: string }) => {
          return Response.message(
            `Your test was successful from API version ${version}!`
          );
        },
      })
      .add(["1.0.2", "1.0.5"], {
        handler: ({ version }: { version: string }) => {
          return Response.message(
            `Latest test was successful from API version ${version}!`
          );
        },
      });
  }
}

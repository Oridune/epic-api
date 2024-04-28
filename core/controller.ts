// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  BaseController,
  Controller,
  Env,
  Get,
  Loader,
  Response,
  Store,
  Versioned,
} from "@Core/common/mod.ts";
import { Database } from "@Database";

@Controller("/api/", {
  name: "api",
  childs: async () => {
    const Controllers: Array<typeof BaseController> = [];

    for (const [, SubLoader] of Loader.getLoaders() ?? []) {
      for (
        const [, Controller] of SubLoader.tree.get("controllers")?.modules ??
          []
      ) {
        const Module = await Controller.import();

        if (typeof Module.default === "function") {
          Controllers.push(Module.default);
        }
      }
    }

    for (const [, Controller] of Loader.getModules("controllers") ?? []) {
      const Module = await Controller.import();

      if (typeof Module.default === "function") {
        Controllers.push(Module.default);
      }
    }

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
            `Your test was successful from API version ${version}!`,
          );
        },
      })
      .add(["1.0.2", "1.0.5"], {
        handler: ({ version }: { version: string }) => {
          return Response.message(
            `Latest test was successful from API version ${version}!`,
          );
        },
      });
  }
}

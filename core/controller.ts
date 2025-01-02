// deno-lint-ignore-file no-explicit-any ban-unused-ignore
import {
  BaseController,
  Controller,
  Env,
  EnvType,
  Get,
  getMemoryUsageDetails,
  type IRequestContext,
  type IRoute,
  Loader,
  Response,
  Store,
  Versioned,
} from "@Core/common/mod.ts";
import { Database } from "@Database";
import e from "validator";
import { type RouterContext } from "oak";
import { generatePostmanCollection } from "@Core/scripts/syncPostman.ts";
import { denoConfig } from "@Core/common/denoConfig.ts";
import { I18next } from "@I18n";

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
        languages: Array.from(I18next.availableLanguages ?? []),
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

  @Get("/postman/", {
    disabled: Env.is(EnvType.PRODUCTION),
  })
  public postman(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.deepCast(
      e.object({
        name: e.optional(e.string()),
        description: e.optional(e.string()),
      }, { allowUnexpectedProps: true }),
    );

    return {
      shape: () => ({
        query: QuerySchema.toSample(),
      }),
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        const Collection = await generatePostmanCollection(ctx.routes, {
          name: Query.name ?? denoConfig.title,
          description: Query.description ?? denoConfig.description,
          version: ctx.requestedVersion,
        });

        return Response.data(Collection);
      },
    };
  }

  @Get("/heap/snapshot/:filename?/")
  public heapSnapshot(_: IRoute) {
    return {
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        if (typeof ctx.router.takeHeapSnapshot !== "function") {
          throw new Error("Heap snapshot is not available.");
        }

        const snapshotPath = await ctx.router.takeHeapSnapshot();

        const snapshot = await Deno.open(snapshotPath, { read: true });

        return Response.raw(snapshot.readable, "application/octet-stream");
      },
    };
  }

  @Get("/memory/usage/")
  public memoryUsage(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.deepCast(
      e.object({
        project: e.optional(e.record(e.number().min(0).max(1))),
      }, { allowUnexpectedProps: true }),
    );

    return {
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` },
        );

        return Response.data(getMemoryUsageDetails(Query));
      },
    };
  }
}

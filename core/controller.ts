// deno-lint-ignore-file no-explicit-any
import {
  Controller,
  BaseController,
  Get,
  Versioned,
  Response,
} from "@Core/common/mod.ts";
import Manager from "@Core/common/manager.ts";

@Controller("/api/", {
  name: "api",
  childs: [
    ...(await (
      await Manager.getActivePlugins()
    ).reduce<Promise<any[]>>(
      async (list, manager) => [
        ...(await list),
        ...(await manager.getModules("controllers")),
      ],
      Promise.resolve([])
    )),
    ...(await Manager.getModules("controllers")),
  ],
})
export class APIController extends BaseController {
  @Get("/")
  public home() {
    return () => {
      return Response.message("Hurry! The API is online!");
    };
  }

  @Get("/test/")
  public test() {
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
            `Another test was successful from API version ${version}!`
          );
        },
      });
  }
}

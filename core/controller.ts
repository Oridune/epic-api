// deno-lint-ignore-file no-explicit-any
import { Controller, BaseController, Response, Get } from "@Core/common/mod.ts";
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
    return Response.message("Hurry! The API is online!");
  }
}

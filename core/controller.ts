import { Controller, BaseController, Response, Get } from "@Core/common/mod.ts";
import Manager from "@Core/common/manager.ts";

@Controller("/", {
  childs: [
    ...(await (
      await Manager.getPlugins()
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
export class MainController extends BaseController {
  @Get()
  public Home() {
    return Response.message("Hurry! the application is online!");
  }
}

import {
  Controller,
  BaseController,
  Response,
  Manager,
  Get,
} from "@Core/common/mod.ts";

@Controller("/", {
  childs: await Manager.load("controllers"),
})
export class MainController extends BaseController {
  @Get()
  public Home() {
    return Response.message("Hurry! the application is online!");
  }
}

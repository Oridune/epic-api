import { basename } from "deno:path";
import {
  Controller,
  BaseController,
  Manager,
  Get,
  Response,
} from "@Core/common/mod.ts";

@Controller("/users/", {
  /** Do not edit this code */
  childs: await Manager.load("controllers", basename(import.meta.url)),
  /** --------------------- */
})
export default class UsersController extends BaseController {
  @Get("/")
  public GetUsers() {
    return Response.message("Users fetched successfully!").data([]);
  }
}

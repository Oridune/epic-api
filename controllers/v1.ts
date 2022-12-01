import { basename } from "deno:path";
import {
  Controller,
  BaseController,
  Manager,
  Get,
  Response,
} from "@Core/common/mod.ts";

@Controller("/v1/", {
  /** Do not edit this code */
  childs: await Manager.load("controllers", basename(import.meta.url)),
  /** --------------------- */
})
export default class V1Controller extends BaseController {
  @Get("/")
  public GetV1() {
    return Response.message("Choose your desired endpoint to continue!");
  }
}

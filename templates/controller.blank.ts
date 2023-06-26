import {
  Controller,
  BaseController,
  Get,
  Response,
  type IRequestContext,
} from "@Core/common/mod.ts";
import Manager from "@Core/common/manager.ts";
import { type RouterContext } from "oak";

@Controller("/$_namePath/", {
  name: "$_fullNameCamel",

  /** Do not edit this code */
  childs: () => Manager.getModules("controllers", import.meta.url),
  /** --------------------- */
})
export default class $_fullNamePascalController extends BaseController {
  @Get("/")
  public list() {
    // Write any validation schemas or meta logic here.
    // Information returned from this function can be used to generate docs etc.

    return (ctx: IRequestContext<RouterContext<string>>) => {
      // This function actually handles the request!
      // Start coding here...

      return Response.status(true);
    };
  }
}

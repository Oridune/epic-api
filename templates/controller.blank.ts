import {
  Controller,
  BaseController,
  Get,
  Response,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { type RouterContext } from "oak";

@Controller("/$_namePath/", { name: "$_nameCamel" })
export default class $_fullNamePascalController extends BaseController {
  @Get("/")
  public list() {
    // This is a factory method that returns a request handler.
    // Write any validation schemas or meta logic here.
    // Information returned from this function can be used to generate docs etc.

    return (ctx: IRequestContext<RouterContext<string>>) => {
      // This function actually handles the request!
      // Start coding here...

      return Response.status(true);
    };
  }
}

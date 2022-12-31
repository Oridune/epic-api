import { basename } from "path";
import {
  Controller,
  BaseController,
  Get,
  Post,
  Response,
  type IRequestContext,
} from "@Core/common/mod.ts";
import Manager from "@Core/common/manager.ts";
import { Status, type RouterContext } from "oak";
import e from "validator";

@Controller("/$_namePath/", {
  /** Do not edit this code */
  childs: await Manager.getModules("controllers", basename(import.meta.url)),
  /** --------------------- */
})
export default class $_namePascalController extends BaseController {
  @Post("/")
  async Create$_namePascal(ctx: IRequestContext<RouterContext<string>>) {
    // Query Validation
    const Query = await e
      .object({}, { allowUnexpectedProps: true })
      .validate(Object.fromEntries(ctx.router.request.url.searchParams), {
        name: "$_namePascal.query",
      });

    /**
     * It is recommended to keep the following validators in place even if you don't want to validate any data.
     * It will prevent the client from injecting unexpected data into the request.
     *
     * */

    // Params Validation
    const Params = await e
      .object({})
      .validate(ctx.router.params, { name: "$_namePascal.params" });

    // Body Validation
    const Body = await e
      .object({})
      .validate(await ctx.router.request.body({ type: "json" }).value, {
        name: "$_namePascal.body",
      });

    // Start coding here...

    return Response.statusCode(Status.Created);
  }

  @Get("/")
  async Get$_namePascal(ctx: IRequestContext<RouterContext<string>>) {
    // Query Validation
    const Query = await e
      .object({}, { allowUnexpectedProps: true })
      .validate(Object.fromEntries(ctx.router.request.url.searchParams), {
        name: "$_namePascal.query",
      });

    /**
     * It is recommended to keep the following validators in place even if you don't want to validate any data.
     * It will prevent the client from injecting unexpected data into the request.
     *
     * */

    // Params Validation
    const Params = await e
      .object({})
      .validate(ctx.router.params, { name: "$_namePascal.params" });

    // Start coding here...

    return Response.status(true);
  }
}

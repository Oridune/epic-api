import { basename } from "path";
import {
  Controller,
  BaseController,
  Manager,
  Get,
  Post,
  Response,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { Status, type RouterContext } from "oak";
import e from "validator";

@Controller("/$_name/", {
  /** Do not edit this code */
  childs: await Manager.load("controllers", basename(import.meta.url)),
  /** --------------------- */
})
export default class $_NameController extends BaseController {
  @Post("/")
  async Create$_Name(ctx: IRequestContext<RouterContext<string>>) {
    // Query Validation
    const Query = await e
      .object({}, { allowUnexpectedProps: true })
      .validate(ctx.router.request.url.searchParams, { name: "$_name.query" });

    /**
     * It is recommended to keep the following validators in place even if you don't want to validate any data.
     * It will prevent the client from injecting unexpected data into the request.
     *
     * */

    // Params Validation
    const Params = await e
      .object({})
      .validate(ctx.router.params, { name: "$_name.params" });

    // Body Validation
    const Body = await e
      .object({})
      .validate(await ctx.router.request.body({ type: "json" }).value, {
        name: "$_name.body",
      });

    // Start coding here...

    return Response.statusCode(Status.Created);
  }

  @Get("/")
  async Get$_Name(ctx: IRequestContext<RouterContext<string>>) {
    // Query Validation
    const Query = await e
      .object({}, { allowUnexpectedProps: true })
      .validate(ctx.router.request.url.searchParams, { name: "$_name.query" });

    /**
     * It is recommended to keep the following validators in place even if you don't want to validate any data.
     * It will prevent the client from injecting unexpected data into the request.
     *
     * */

    // Params Validation
    const Params = await e
      .object({})
      .validate(ctx.router.params, { name: "$_name.params" });

    // Start coding here...

    return Response.status(true);
  }
}

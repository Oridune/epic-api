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
  name: "$_fullNameCamel",

  /** Do not edit this code */
  childs: () => Manager.getModules("controllers", import.meta.url),
  /** --------------------- */
})
export default class $_fullNamePascalController extends BaseController {
  @Post("/")
  public create() {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Define Body Schema
    const BodySchema = e.object({});

    // Request Handler Object
    const RequestHandler = {
      postman: {
        query: QuerySchema.toSample().data,
        params: ParamsSchema.toSample().data,
        body: BodySchema.toSample().data,
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: "$_fullNameCamel.query" }
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         *
         * */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: "$_fullNameCamel.params",
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: "$_fullNameCamel.body" }
        );

        // Start coding here...

        return Response.statusCode(Status.Created);
      },
    };

    return new Map().set("1.0.0", RequestHandler);
  }

  @Get("/")
  public list() {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Request Handler Object
    const RequestHandler = {
      postman: {
        query: QuerySchema.toSample().data,
        params: ParamsSchema.toSample().data,
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: "$_fullNameCamel.query" }
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         *
         * */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: "$_fullNameCamel.params",
        });

        // Start coding here...

        return Response.status(true);
      },
    };

    return new Map().set("1.0.0", RequestHandler);
  }
}

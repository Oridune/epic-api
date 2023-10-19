import {
  Controller,
  BaseController,
  Get,
  Post,
  Patch,
  Delete,
  Versioned,
  Response,
  type IRoute,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { Status, type RouterContext } from "oak";
import e from "validator";

import { $_namePascalModel } from "@Models/$_name.ts";

@Controller("/$_namePath/", { name: "$_nameCamel" })
export default class $_namePascalController extends BaseController {
  @Post("/")
  public create(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Define Body Schema
    const BodySchema = e.object({});

    return new Versioned().add("1.0.0", {
      postman: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` }
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         *
         * */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` }
        );

        return Response.statusCode(Status.Created).data(
          await new $_namePascalModel(Body).save()
        );
      },
    });
  }

  @Patch("/:id/")
  public update(route: IRoute) {
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.string(),
    });

    // Define Body Schema
    const BodySchema = e.object({});

    return new Versioned().add("1.0.0", {
      postman: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` }
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         *
         * */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body({ type: "json" }).value,
          { name: `${route.scope}.body` }
        );

        const $_namePascalUpdated = await $_namePascalModel.findByIdAndUpdate(
          Params.id,
          Body,
          { new: true }
        );

        if (!$_namePascalUpdated)
          ctx.router.throw(
            Status.NotFound,
            "Updating failed! Target not found."
          );

        return Response.data($_namePascalUpdated);
      },
    });
  }

  @Get("/:id?/")
  public get(route: IRoute) {
    const CurrentTimestamp = Date.now();

    // Define Query Schema
    const QuerySchema = e.object(
      {
        search: e.optional(e.string()),
        range: e
          .optional(
            e.tuple([e.date().end(CurrentTimestamp), e.date()], { cast: true })
          )
          .default([Date.now() - 86400000 * 7, Date.now()]),
        offset: e.optional(e.number({ cast: true }).min(0)),
        limit: e.optional(e.number({ cast: true })),
        sort: e
          .optional(
            e.record(e.number({ cast: true }).min(-1).max(1), { cast: true })
          )
          .default({ _id: -1 }),
        includeTotalCount: e.optional(e.boolean({ cast: true })),
      },
      { allowUnexpectedProps: true }
    );

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.optional(e.string()),
    });

    return Versioned.add("1.0.0", {
      postman: {
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          Object.fromEntries(ctx.router.request.url.searchParams),
          { name: `${route.scope}.query` }
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         *
         * */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        const $_namePascalListQuery = $_namePascalModel.find({
          ...(Query.search
            ? {
                $text: {
                  $search: Query.search,
                },
              }
            : {}),
          ...(Params.id ? { _id: Params.id } : {}),
          createdAt: {
            $gt: Query.range[0],
            $lt: Query.range[1],
          },
        });

        if (typeof Query.offset === "number")
          $_namePascalListQuery.skip(Query.offset);

        if (typeof Query.limit === "number")
          $_namePascalListQuery.limit(Query.limit);

        return Response.data({
          totalCount: Query.includeTotalCount
            ? //? Make sure to pass any limiting conditions for count if needed.
              await $_namePascalModel.count()
            : undefined,
          results: await $_namePascalListQuery.sort(Query.sort as any),
        });
      },
    });
  }

  @Delete("/:id/")
  public delete(route: IRoute) {
    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.optional(e.string()),
    });

    return Versioned.add("1.0.0", {
      postman: {
        params: ParamsSchema.toSample(),
      },
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        await $_namePascalModel.deleteOne({ _id: Params.id });

        return Response.true();
      },
    });
  }
}
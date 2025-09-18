---
description: Implement a blog CRUD using Epic API.
---

# Blog API CRUD

This tutorial will guide you in creating a CRUD operation for a blog API. By the end of this article, you will have enhanced your understanding of API development using the Epic API framework. It will provide insights into best practices and effective coding structures for your projects.

This tutorial assumes that you have already set up an Epic API project on your local machine to follow along. If you haven't set up the project, see the [Getting Started](../) page of this documentation.

## Overview

We are going to create a CRUD operation that consists of a `posts` controller and a `post` model. The posts controller will have 4 different endpoints (create, get, update, delete).

Most of our jobs can be completed automatically by executing the relevant commands built into the Epic API framework, as we learned earlier in this documentation.

### Start the development

We will execute the create module command to auto-generate a model as follows:

```sh
# Execute the built-in Deno task
deno task create -t model -n post --template blank.ts.ejs
```

The above command will generate a post.ts file in the models folder. The template code will look like the following:

```typescript
import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";

export const InputPostSchema = e.object({
  // Your user-prompted properties go here...
});

export const PostSchema = e.object({
  _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
  createdAt: e.optional(e.date()).default(() => new Date()),
  updatedAt: e.optional(e.date()).default(() => new Date()),

  // Write any private/system properties here...
}).extends(InputPostSchema);

export type TPostInput = InputDocument<
  inferInput<typeof PostSchema>
>;
export type TPostOutput = OutputDocument<
  inferOutput<typeof PostSchema>
>;

export const PostModel = Mongo.model(
  "post",
  PostSchema,
);

PostModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
```

Now that we have generated the model, let's make some modifications to the model and add some blog post-related fields to it. Usually, a blog post consists of the following fields:

1. title
2. content
3. author

And many more, but let's keep it simple for now. After adding the required fields to our post.ts file will look like the following:

```typescript
import e, { inferInput, inferOutput } from "validator";
import { InputDocument, Mongo, ObjectId, OutputDocument } from "mongo";

// Added the fields in the InputPostSchema as public fields because we will be taking these fields as input from the user in the body, in our posts controller's create endpoint.
export const InputPostSchema = e.object({
  title: e.string().max(80).describe("The title of the blog post"),
  content: e.string().max(3000).describe("The content of the blog post"),
  author: e.string().max(50).describe("Name of the author"),
});

export const PostSchema = e.object({
  _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
  createdAt: e.optional(e.date()).default(() => new Date()),
  updatedAt: e.optional(e.date()).default(() => new Date()),
  
  // Write any private/system properties here...
}).extends(InputPostSchema);

export type TPostInput = InputDocument<
  inferInput<typeof PostSchema>
>;
export type TPostOutput = OutputDocument<
  inferOutput<typeof PostSchema>
>;

export const PostModel = Mongo.model(
  "post",
  PostSchema,
);

PostModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
```

Perfect! Let's now create a controller called posts, where we will define our endpoints to perform the necessary CRUD operations on this model. Let's execute the following command to create a controller:

```sh
# Execute the built-in Deno task
deno task create -t controller -n posts --template crud.ts.ejs
```

The above command will generate a posts.ts file in the controllers folder. The template code will look like the following:

```typescript
import {
  BaseController,
  Controller,
  Delete,
  Get,
  type IRequestContext,
  type IRoute,
  parseQueryParams,
  Patch,
  Post,
  Response,
  Versioned,
} from "@Core/common/mod.ts";
import { responseValidator, normalizeFilters } from "@Core/common/validators.ts";
import { type RouterContext, Status } from "oak";
import e from "validator";
import { queryValidator } from "@Core/common/validators.ts";
import { ObjectId } from "mongo";

import { 
  PostModel, 
  InputPostSchema
} from "@Models/post.ts";

@Controller("/posts/", { name: "posts" })
export default class PostsController extends BaseController {
  @Post("/")
  public create(route: IRoute) {
    // Define Body Schema
    const BodySchema = InputPostSchema;

    return new Versioned().add("1.0.0", {
      shape: () => ({
        body: BodySchema.toSample(),
        return: responseValidator(PostModel.getSchema()).toSample(),
      }),
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body.json(),
          { name: `${route.scope}.body` },
        );

        return Response.statusCode(Status.Created).data(
          await PostModel.create(Body),
        );
      },
    });
  }

  @Patch("/:id/")
  public update(route: IRoute) {
    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.instanceOf(ObjectId, { instantiate: true })
    });

    // Define Body Schema
    const BodySchema = e.partial(InputPostSchema);

    return new Versioned().add("1.0.0", {
      shape: () => ({
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
        return: responseValidator(e.partial(PostModel.getSchema())).toSample(),
      }),
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        // Body Validation
        const Body = await BodySchema.validate(
          await ctx.router.request.body.json(),
          { name: `${route.scope}.body` },
        );

        const { modifications } = await PostModel.updateOneOrFail(
          Params.id,
          Body,
        );

        return Response.data(modifications);
      },
    });
  }

  @Get("/:id?/")
  public get(route: IRoute) {
    // Define Query Schema
    const QuerySchema = queryValidator();

    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.optional(e.instanceOf(ObjectId, { instantiate: true }))
    });

    return Versioned.add("1.0.0", {
      shape: () => ({
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        return: responseValidator(e.object({
          totalCount: e.optional(e.number()),
          results: e.array(PostModel.getSchema())
        })).toSample(),
      }),
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Query Validation
        const Query = await QuerySchema.validate(
          parseQueryParams(ctx.router.request.url.search),
          { name: `${route.scope}.query` },
        );

        /**
         * It is recommended to keep the following validators in place even if you don't want to validate any data.
         * It will prevent the client from injecting unexpected data into the request.
         */

        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        const PostsBaseFilters = {
          ...normalizeFilters(Query.filters),
          ...(Params.id ? { _id: new ObjectId(Params.id) } : {}),
          ...(Query.range instanceof Array
            ? {
              createdAt: {
                $gt: new Date(Query.range[0]),
                $lt: new Date(Query.range[1]),
              },
            }
            : {}),
        };

        const PostsListQuery = PostModel
          .search(Query.search)
          .filter(PostsBaseFilters)
          .sort(Query.sort)
          .skip(Query.offset)
          .limit(Query.limit);

        if (Query.project) PostsListQuery.project(Query.project);

        return Response.data({
          totalCount: Query.includeTotalCount
            //? Make sure to pass any limiting conditions for count if needed.
            ? await PostModel.count(PostsBaseFilters)
            : undefined,
          results: await PostsListQuery,
        });
      },
    });
  }

  @Delete("/:id/")
  public delete(route: IRoute) {
    // Define Params Schema
    const ParamsSchema = e.object({
      id: e.instanceOf(ObjectId, { instantiate: true })
    });

    return Versioned.add("1.0.0", {
      shape: () => ({
        params: ParamsSchema.toSample(),
        return: responseValidator().toSample(),
      }),
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Params Validation
        const Params = await ParamsSchema.validate(ctx.router.params, {
          name: `${route.scope}.params`,
        });

        await PostModel.deleteOneOrFail(Params.id);

        return Response.true();
      },
    });
  }
}

```

Great! Now, because this was a simple CRUD operation, the template was already set up to leverage the existing model and complete the CRUD, so we don't need to do anything else. But, in your case, you may need to modify the above code a little bit to match your use case.

Another thing to keep in mind is that the above endpoints are not protected by default; you will certainly need to write an authorization logic to secure your API.

Now you can run the API and test in a client like Postman to see if everything works fine :tada:

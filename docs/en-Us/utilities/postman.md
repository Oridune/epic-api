---
description: Generate postman collections automatically!
---

# Postman

Epic API can generate a detailed Postman collection for you automatically without writing a single line of code!

Just execute the following command to generate a collection:

```bash
# Execute the built-in Deno task
deno task sync:postman
```

The above command will generate a file at the root of your project called `postman_collection-latest.json`

The `sync:postman` command accepts the following arguments:

| Argument/Alias     | Purpose                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| --name, -n         | You can optionally assign a name to the collection.                                            |
| --key, -k          | Pass a Postman API key if you want to synchronize your collection directly to the Postman app. |
| --collectionId, -c | A collection ID is required in order to sync the collection to the Postman app.                |
| --version, -v      | Generate the collection with a specific version of API endpoints. By default it is `latest`.   |

### Postman Metadata

When you are working on a controller in Epic API, you can optionally pass some extra Postman metadata in the `shape` property of the request handler object that can be used to make your Postman collection more developer-friendly!

Take a look at the following controller:

{% code title="controllers/users.ts" lineNumbers="true" %}
```typescript
import {
  Controller,
  BaseController,
  Get,
  Post,
  Response,
  type IRoute,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { Status, type RouterContext } from "oak";
import e from "validator";

@Controller("/users/", { name: "users" })
export default class UsersController extends BaseController {
  @Post("/")
  public create(_: IRoute) {
    // Usually, you may write the validation schema as follows to validate the incoming request inputs
    // Define Query Schema
    const QuerySchema = e.object({}, { allowUnexpectedProps: true });

    // Define Params Schema
    const ParamsSchema = e.object({});

    // Define Body Schema
    const BodySchema = e.object({});
    
    // Define Response Schema
    const ResponseSchema = e.object({});

    return {
      // This is where you pass the input and output shapes so that the Epic framework can build a Postman collection.
      shape: () => ({
        query: QuerySchema.toSample(),
        params: ParamsSchema.toSample(),
        body: BodySchema.toSample(),
        return: ResponseSchema.toSample(),
      }),
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Start coding here...

        return Response.statusCode(Status.Created);
      },
    };
  }
}

```
{% endcode %}

The `create` endpoint method above returns an object that contains a `shape` property. This property allows you to pass metadata to Postman, which is then used to generate a Postman collection.

Currently, you can pass the shapes of `headers`, `query`, `params`, `body`, and `return`. You can either pass an object that contains sample data, or you can use the Validator schema to generate a sample that will be passed as a shape, as shown in the above example.

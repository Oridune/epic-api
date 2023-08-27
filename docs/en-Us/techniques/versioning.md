---
description: Learn how to serve different versions of your API.
---

# Versioning

Epic API aims to provide a better developer experience while ensuring the application's reliability. Versioning is the most important aspect of software development and we understand its significance deeply. With Epic API, we have implemented a robust versioning strategy that empowers developers to manage changes effectively. Our versioning strategy encompasses both backward compatibility, to ensure that existing integrations continue to function smoothly, and forward compatibility, allowing developers to adopt upcoming changes without major disruptions. This dual approach is at the core of our commitment to a seamless developer experience.

#### When do you need versioning?

If you are working on a project that requires significant changes while it's being served on the production. You are required to version your Epic API endpoints so that whenever a change is required, it is implemented without interrupting the current functioning of the clients (Keeping the backward compatibility).

Epic API exports a `Versioned` class that allows the versioning of the endpoints inside of your controllers. You can execute the following command to create a controller with versioned endpoints from scratch:

```bash
# Execute the built-in Deno task
deno task create:module -t controller -n users --template versioned.ts
```

This command will produce code like the following:

{% code title="controllers/users.ts" lineNumbers="true" %}
```typescript
import {
  Controller,
  BaseController,
  Post,
  Versioned,
  Response,
  type IRoute,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { Status, type RouterContext } from "oak";

@Controller("/users/", { name: "users" })
export default class UsersController extends BaseController {
  @Post("/")
  public create(_: IRoute) {
    return Versioned.add("1.0.0", {
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Start coding here...

        return Response.statusCode(Status.Created);
      },
    });
  }
}

```
{% endcode %}

The above controller contains an endpoint method called `create` which returns a `Versioned` handler. You can add more handlers using `.add` method chained after the initial `.add` call. See the following example:

{% code title="controllers/users.ts" lineNumbers="true" %}
```typescript
import {
  Controller,
  BaseController,
  Post,
  Versioned,
  Response,
  type IRoute,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { Status, type RouterContext } from "oak";

@Controller("/users/", { name: "users" })
export default class UsersController extends BaseController {
  @Post("/")
  public create(_: IRoute) {
    return Versioned
    // Initial version of the request handler
    .add("1.0.0", {
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Start coding here...

        return Response.statusCode(Status.Created);
      },
    })
    // A new version of the request handler
    .add("2.0.0", {
      handler: async (ctx: IRequestContext<RouterContext<string>>) => {
        // Start coding here...

        return Response.statusCode(Status.Created);
      },
    });
  }
}

```
{% endcode %}

Now that you understand how to create multiple versions of the endpoint, You might be thinking how to consume them. Right?

Basically on the client side, you just need to pass a header `X-API-Version` specifying your desired endpoint version, and the server will respond with that specific handler version.

Epic API uses the Semantic versioning system to resolve the endpoint versions. [Learn more about Semantic versioning here](https://semver.org/).

{% hint style="info" %}
**Pro Tip:** You can pass `latest` in the `X-API-Version` header so that the API always executes the latest version of the endpoints.
{% endhint %}

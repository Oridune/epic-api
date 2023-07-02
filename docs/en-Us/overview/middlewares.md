---
description: Middleware is a function which is called before the actual request handler.
---

# Middlewares

Middleware functions have access to the request and response [context](https://oakserver.github.io/oak/#context), and the `next()` middleware function is in the application’s request-response cycle. The `next()` middleware function is commonly denoted by a variable named `next`. Every request made by the client has to pass through a middleware function, where this request can be validated, modified, and/or extended. An Epic API middleware, by default, is equivalent to [Oak](https://oakserver.github.io/oak) middleware.

You can execute the following command to create a middleware:

```bash
# Execute the built-in Deno task
deno task create:module -t middleware -n checkAuth --template blank.ts
```

This command is going to generate the following code:

{% code title="middlewares/checkAuth.ts" lineNumbers="true" %}
```typescript
import { type RouterContext } from "oak";

// If this is a global middleware, do not add arguments to the factory function.
export default () =>
  async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
    // Your logic here...

    // Continue to the next middleware
    await next();
  };

```
{% endcode %}

By default, Epic API registers middleware on a global level. If you want to add this middleware to a specific controller or a route, then you can add this middleware to the `excludes` array in the `middlewares/.sequence.json` file. Your file should look like the following:

{% code title="middlewares/.sequence.json" lineNumbers="true" %}
```json
{
  "sequence": ["checkAuth.ts"],
  "excludes": ["checkAuth.ts"]
}

```
{% endcode %}

Your middleware `checkAuth.ts` will be removed from the global scope. Now you can import this middleware into any controller. See the following example:

{% code title="Middleware on controller" lineNumbers="true" %}
```typescript
import { Controller, BaseController } from "@Core/common/mod.ts";

import checkAuth from "@Middlewares/checkAuth.ts"; // Import your middleware

@Controller("/users/", {
  name: "users",
  middlewares: [checkAuth()], // Add multiple middlewares here...
})
export default class UsersController extends BaseController {}

```
{% endcode %}

If you want to add this middleware to a specific route, See the following example:

{% code title="Middleware on route" lineNumbers="true" %}
```typescript
import {
  Controller,
  BaseController,
  Get,
  Response,
  type IRequestContext,
} from "@Core/common/mod.ts";
import { type RouterContext } from "oak";

import checkAuth from "@Middlewares/checkAuth.ts"; // Import your middleware

@Controller("/users/", {
  name: "users",
})
export default class UsersController extends BaseController {
  @Get("/", {
    middlewares: [checkAuth()], // Add multiple middlewares here...
  })
  public list() {
    return (ctx: IRequestContext<RouterContext<string>>) => Response.status(true);
  }
}

```
{% endcode %}

Use the following command to delete the middleware:

{% hint style="warning" %}
**Warning!** You cannot undo the following command, which can lead to a code deletion! Be careful when using this command.
{% endhint %}

```bash
# Execute the built-in Deno task
deno task delete:module -t middleware -n checkAuth.ts
```

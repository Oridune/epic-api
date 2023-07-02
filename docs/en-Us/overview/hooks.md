---
description: Hooks are executed before and after the request handler is executed.
---

# Hooks

Hooks in the Epic API framework offer a powerful mechanism to extend the framework's behavior, enabling developers to execute certain functions or code snippets before and after the request handler.

Hooks are divided into two categories: pre-hooks and post-hooks. Pre-hooks are executed before the request handler is invoked, while post-hooks are executed after the request handler has finished its execution. This setup allows developers to perform necessary tasks or implement additional logic at different stages of the request lifecycle.

### Pre Hooks

When a request is received by the Epic API framework, it first checks for any registered pre-hooks associated with that specific route or endpoint. If pre-hooks are present, they are executed in the order they were defined. These pre-hooks can perform tasks such as request validation, authentication, or data manipulation before passing the control to the request handler.

### Post Hooks

Once the pre-hooks have completed their execution, the request is passed to the request handler for further processing. The request handler is responsible for generating the response based on the received request. After the request handler completes its execution, the framework checks for any registered post-hooks associated with the route or endpoint. Like pre-hooks, post-hooks are executed in the order they were defined and can be utilized to perform tasks such as response formatting, logging, or caching.

You can execute the following command to create a hook:

```bash
# Execute the built-in Deno task
deno task create:module -t hook -n checkPermission --template blank.ts
```

This command is going to generate the following code:

{% code title="hooks/checkPermission.ts" lineNumbers="true" %}
```typescript
import {
  type IRequestContext,
  type RawResponse,
  type Response,
} from "@Core/common/mod.ts";
import { type RouterContext } from "oak";

export default {
  pre: (
    scope: string,
    name: string,
    _ctx: IRequestContext<RouterContext<string>>
  ) => {
    console.info(
      "We are going to execute the following scope.permission:",
      `${scope}.${name}`
    );
  },
  post: (
    scope: string,
    name: string,
    _detail: {
      ctx: IRequestContext<RouterContext<string>>;
      res: RawResponse | Response;
    }
  ) => {
    console.info(
      "We have executed the following scope.permission:",
      `${scope}.${name}`
    );
  },
};

```
{% endcode %}

The above code snippet contains both pre and post-hooks. You can remove one of these hooks from the object if needed.


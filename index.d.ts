// deno-lint-ignore-file no-empty-interface no-explicit-any
import "ts-reset";
import "@Core/common/controller/base.ts";

declare module "@Core/common/controller/base.ts" {
  interface IRouterContextExtendor {
    // Override properties here
  }

  interface IRequestHandlerObjectExtendor {
    postman?: {
      headers?: Record<string, any>;
      query?: Record<string, any>;
      params?: Record<string, any>;
      body?: Record<string, any>;
    };

    // Override properties here
  }
}

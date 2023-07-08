import e from "validator";
import { type RouterContext } from "oak";

// If this is a global middleware, do not add arguments to the factory function.
export default () =>
  async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
    // Query Validation (You can remove this validation if not required)
    const Query = await e
      .object({}, { allowUnexpectedProps: true })
      .validate(Object.fromEntries(ctx.request.url.searchParams), {
        name: "query",
      });

    // Continue to next middleware
    await next();
  };

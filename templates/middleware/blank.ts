import e from "deno:validator";
import { type RouterContext } from "deno:oak";

export default () =>
  async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
    // Query Validation (You can remove this validation if not required)
    const _Query = await e
      .object({}, { allowUnexpectedProps: true })
      .validate(ctx.request.url.searchParams, { name: "query" });

    // Continue to next middleware
    await next();
  };

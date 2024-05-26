// deno-lint-ignore-file no-explicit-any
import { Context, isHttpError, Status } from "oak";
import { ValidationException } from "validator";
import {
  Env,
  EnvType,
  RawResponse,
  respondWith,
  Response,
} from "@Core/common/mod.ts";

export const errorHandler = () =>
async (
  ctx: Context<Record<string, any>, Record<string, any>>,
  next: () => Promise<unknown>,
) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof Response || error instanceof RawResponse) {
      await respondWith(ctx, error);
    } else {
      const StatusCode = isHttpError(error)
        ? error.status
        : error instanceof ValidationException
        ? Status.BadRequest
        : Status.InternalServerError;

      const ResponseObject = Response.statusCode(StatusCode).messages(
        error.issues ?? [{ message: error.message }],
      );

      if (!Env.is(EnvType.PRODUCTION) && StatusCode > 499) {
        if (error.stack !== undefined) ResponseObject.errorStack(error.stack);

        if (error.cause !== undefined) {
          ResponseObject.metadata({ cause: error.cause });
        }
      }

      Object.entries<string>(error).forEach(
        ([key, value]) =>
          /^x-.*/i.test(key) && ResponseObject.header(key, value),
      );

      await respondWith(ctx, ResponseObject);
    }

    if (!Env.is(EnvType.PRODUCTION)) {
      console.error(
        `${ctx.request.method.toUpperCase()}: ${ctx.request.url.pathname}`,
        error,
      );

      if (error.cause !== undefined) {
        console.info("Error Cause:", error.cause);
      }
    }
  }
};

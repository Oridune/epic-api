// deno-lint-ignore-file no-explicit-any
import i18next from "i18next";
import { Context } from "oak/context.ts";

// @deno-types="npm:@types/accept-language-parser"
import lngParser from "lngParser";

export const useTranslator = async () => {
  const { translator } = await import("../../i18next.ts");

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
  ) => {
    const Languages = lngParser.parse(
      ctx.request.headers.get("accept-language") ?? undefined,
    );

    // Pass the translator to the request context
    ctx.i18n = i18next;
    ctx.t = translator(Languages[0]?.code);

    await next();
  };
};

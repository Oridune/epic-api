// deno-lint-ignore-file no-explicit-any
import { Context } from "oak/context";

// @deno-types="npm:@types/accept-language-parser"
import lngParser from "lngParser";

export const useTranslator = async () => {
  const { I18next } = await import("@I18n");

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
  ) => {
    const Languages = lngParser.parse(
      ctx.request.headers.get("accept-language") ?? undefined,
    );
    const Language = Languages[0]?.code;

    // Pass the translator instance to the request context
    ctx.i18n = I18next;

    // Pass the translator to the request context
    ctx.t = I18next.translator(Language).bind(I18next);

    // Pass the translator to the request context
    ctx.tvar = I18next.tvar.bind(I18next);

    await next();
  };
};

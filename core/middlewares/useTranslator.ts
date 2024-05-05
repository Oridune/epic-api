// deno-lint-ignore-file no-explicit-any
import { Context } from "oak/context.ts";

// @deno-types="npm:@types/accept-language-parser"
import lngParser from "lngParser";

export const useTranslator = async () => {
  const { I18next } = await import("../../i18next.ts");

  const Translators: Record<string, Context["t"]> = {};

  return async (
    ctx: Context<Record<string, any>, Record<string, any>>,
    next: () => Promise<unknown>,
  ) => {
    const Languages = lngParser.parse(
      ctx.request.headers.get("accept-language") ?? undefined,
    );
    const Language = Languages[0]?.code;

    // Pass the translator to the request context
    ctx.i18n = I18next;

    ctx.t = Translators[Language] ??= I18next.translator(Language);

    ctx.tvar = (...args: Parameters<typeof ctx.t>) =>
      Array.from(I18next.availableLanguages).reduce<Record<string, any>>(
        (trns, lng) => {
          trns[lng] = (Translators[lng] ??= I18next.translator(lng))(...args);
          return trns;
        },
        {},
      );

    await next();
  };
};

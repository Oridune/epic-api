import { Env, EnvType, Loader } from "@Core/common/mod.ts";
import i18next from "i18next";

const Locales = Array.from(
  Loader.getSequence("locales")?.listDetailed({ enabled: true }) ?? [],
);

const PluginLocales: typeof Locales = [];

for (const [, SubLoader] of Loader.getLoaders() ?? []) {
  for (
    const [, SubLocales] of SubLoader.tree
      .get("locales")
      ?.sequence.listDetailed({ enabled: true }) ?? []
  ) PluginLocales.push([SubLocales.name, SubLocales]);
}

const DefaultLanguage = "en";
const Resources = await [...Locales, ...PluginLocales].reduce(
  async (locales, [name, { path }]) => {
    const Locales = await locales;
    const Key = name.replace(".json", "");
    const Translation = (await import(`file://${path}`, {
      with: { type: "json" },
    })).default;

    if (Locales[Key]) {
      Locales[Key] = Object.assign(Locales[Key], Translation);
    } else Locales[Key] = Translation;

    return Locales;
  },
  Promise.resolve<Record<string, { translation: Record<string, string> }>>(
    {},
  ),
);

await i18next
  .init({
    debug: !Env.is(EnvType.PRODUCTION),
    fallbackLng: DefaultLanguage,
    resources: Resources,
  });

export class I18next {
  static core = i18next;

  static availableLanguages = new Set([
    DefaultLanguage,
    ...Object.keys(Resources),
  ]);

  static translator = (lng?: string | null) =>
    i18next.getFixedT(lng ?? DefaultLanguage);
}

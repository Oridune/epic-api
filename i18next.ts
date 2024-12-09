// deno-lint-ignore-file no-explicit-any
import { Env, EnvType, Loader } from "@Core/common/mod.ts";
import i18next from "i18next";

export class I18next {
  static defaultLng = "en";
  static instance = i18next;
  static translators: Record<
    string,
    ReturnType<typeof I18next.translator>
  > = {};

  static availableLanguages?: Set<string>;

  static async init() {
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

    const Resources = await [...Locales, ...PluginLocales].reduce(
      async (locales, [name, { path }]) => {
        const Locales = await locales;
        const Key = name.replace(".json", "");
        const Translation = (await import(`file://${path}`, {
          with: { type: "json" },
        })).default;

        if (typeof Translation?.translation === "object") {
          if (typeof Locales[Key] === "object") {
            Locales[Key].translation = Object.assign(
              Locales[Key].translation,
              Translation.translation,
            );
          } else Locales[Key] = Translation;
        }

        return Locales;
      },
      Promise.resolve<Record<string, { translation: Record<string, string> }>>(
        {},
      ),
    );

    await this.instance
      .init({
        debug: !Env.is(EnvType.PRODUCTION),
        fallbackLng: this.defaultLng,
        resources: Resources,
      });

    this.availableLanguages = new Set([
      I18next.defaultLng,
      ...Object.keys(Resources),
    ]);
  }

  static translator(
    lng = this.defaultLng,
  ): ReturnType<
    typeof this.instance.getFixedT
  > {
    return (I18next.translators[lng] ??= this.instance.getFixedT(lng));
  }

  static tvar(...args: Parameters<ReturnType<typeof this.translator>>) {
    return Array.from(this.availableLanguages ?? []).reduce<
      Record<string, any>
    >(
      (trns, lng) => {
        trns[lng] = this.translator(lng)(...args);
        return trns;
      },
      {},
    );
  }
}

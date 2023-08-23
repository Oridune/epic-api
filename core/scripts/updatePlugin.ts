import { parse } from "flags";
import e from "validator";

import { Select, Confirm } from "cliffy:prompt";
import { PluginSource, addPlugin } from "@Core/scripts/addPlugin.ts";
import { removePlugin } from "@Core/scripts/removePlugin.ts";
import { Loader } from "@Core/common/loader.ts";

export const updatePlugin = async (options: {
  source?: PluginSource;
  name: string | string[];
  prompt?: boolean;
}) => {
  try {
    const PluginsList = Array.from(
      Loader.getSequence("plugins")?.includes() ?? []
    );

    const Options = await e
      .object(
        {
          source: e
            .optional(e.enum(Object.values(PluginSource)))
            .default(PluginSource.GIT),
          name: e
            .optional(e.array(e.in(PluginsList), { cast: true, splitter: "," }))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? [
                    await Select.prompt({
                      message: "Choose the plugin to be updated",
                      options: PluginsList,
                    }),
                  ]
                : undefined
            ),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.name) {
      if (
        options.prompt &&
        !(await Confirm.prompt({
          message: `Do you really want to update the plugin(s) '${Options.name.join(
            ", "
          )}'?`,
        }))
      )
        return;

      await removePlugin({ name: Options.name });
      await addPlugin({ source: Options.source, name: Options.name });
    } else throw new Error(`The plugin name(s) is missing.`);

    console.info("Plugin(s) updated successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { source, s, name, n } = parse(Deno.args);

  await Loader.load({ includeTypes: ["plugins"], sequenceOnly: true });

  await updatePlugin({
    source: source ?? s,
    name: name ?? n,
    prompt: true,
  });
}

import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Select, Confirm } from "cliffy:prompt";
import { Loader } from "@Core/common/loader.ts";

import { updatePluginDeclarationFile } from "./addPlugin.ts";

export const removePluginFromImportMap = async (name: string) => {
  const ImportMapPath = join(Deno.cwd(), "import_map.json");

  const ImportMap = (
    await import(`file:///${ImportMapPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const TargetScope = `./plugins/${name}/`;

  delete ImportMap.imports?.[`@Plugin/${name}/`];
  delete ImportMap.scopes?.[TargetScope];

  await Deno.writeTextFile(
    ImportMapPath,
    JSON.stringify(ImportMap, undefined, 2)
  );
};

export const removePlugin = async (options: {
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
          name: e
            .optional(e.array(e.in(PluginsList), { cast: true, splitter: "," }))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? [
                    await Select.prompt({
                      message: "Choose the plugin to be deleted",
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
          message: `Do you really want to delete the plugin(s) '${Options.name.join(
            ", "
          )}'?`,
        }))
      )
        return;

      for (const PluginName of Options.name) {
        const PluginPath = join(Deno.cwd(), "plugins", PluginName);

        await Loader.getSequence("plugins")?.set((_) => {
          _.delete(PluginName);
          return _;
        });

        await removePluginFromImportMap(PluginName);
        await updatePluginDeclarationFile();

        await Deno.remove(PluginPath, { recursive: true });
      }
    } else
      throw new Error(
        `We couldn't delete that plugin! The plugin name is missing.`
      );

    console.info("Plugin has been removed successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  await Loader.load({ includeTypes: ["plugins"], sequenceOnly: true });

  await removePlugin({
    name: name ?? n,
    prompt: true,
  });
}

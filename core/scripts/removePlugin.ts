import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Select, Confirm } from "cliffy:prompt";
import Manager from "@Core/common/manager.ts";

export const removePluginFromImportMap = async (name: string) => {
  const ImportMapPath = join(Deno.cwd(), "import_map.json");

  const ImportMap = (
    await import(`file:///${ImportMapPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const TargetScope = `./plugins/${name}/`;
  delete ImportMap.scopes?.[TargetScope];

  await Deno.writeTextFile(
    ImportMapPath,
    JSON.stringify(ImportMap, undefined, 2)
  );
};

export const removePlugin = async (options: {
  name: string;
  prompt?: boolean;
}) => {
  try {
    const PluginsList = Array.from(await Manager.getSequence("plugins"));
    const Options = await e
      .object(
        {
          name: e.optional(e.in(PluginsList)).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Select.prompt({
                  message: "Choose the plugin to be deleted",
                  options: PluginsList,
                })
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
          message: `Do you really want to delete the plugin '${Options.name}'?`,
        }))
      )
        return;

      const PluginPath = join(Deno.cwd(), "plugins", Options.name);

      await Manager.setSequence("plugins", (seq) => {
        seq.delete(Options.name!);
        return seq;
      });

      await removePluginFromImportMap(Options.name);

      await Deno.remove(PluginPath, { recursive: true });
    }

    console.info("Plugin has been removed successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  removePlugin({
    name: name ?? n,
    prompt: true,
  });
}

import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Confirm, Select } from "cliffy:prompt";
import { ISequenceDetail, Loader } from "@Core/common/loader.ts";

import { run } from "./lib/run.ts";
import {
  PluginSource,
  resolvePluginName,
  updatePluginDeclarationFile,
} from "./addPlugin.ts";

export const removePluginFromImportMap = async (name: string) => {
  const ImportMapPath = join(Deno.cwd(), "import_map.json");

  const ImportMap = (
    await import(`file:///${ImportMapPath}`, {
      with: { type: "json" },
    })
  ).default;

  delete ImportMap.imports?.[`@Plugins/${name}/`];
  delete ImportMap.scopes?.[`./plugins/${name}/`];

  await Deno.writeTextFile(
    ImportMapPath,
    JSON.stringify(ImportMap, undefined, 2),
  );
};

export const removePlugin = async (options: {
  name: string | string[];
  prompt?: boolean;
}) => {
  try {
    const PluginsList = Array.from(
      Loader.getSequence("plugins")?.includes() ?? [],
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
        { allowUnexpectedProps: true },
      )
      .validate(options);

    const PluginDetails: ISequenceDetail[] = [];

    if (Options.name) {
      if (
        options.prompt &&
        !(await Confirm.prompt({
          message: `Do you really want to delete the plugin(s) '${
            Options.name.join(
              ", ",
            )
          }'?`,
        }))
      ) {
        return PluginDetails;
      }

      for (const PluginId of Options.name) {
        const [PluginName] = PluginId.split(":");

        const ResolvedPluginName = resolvePluginName(PluginName);

        const PluginDetail = Loader.getSequence("plugins")?.getDetailed(
          ResolvedPluginName,
        );

        if (PluginDetail) {
          PluginDetails.push(PluginDetail);

          const PathToPlugin = join("plugins", ResolvedPluginName);

          const [deinitCommand, deinitCommandOptions] =
            PluginDetail.props.source === PluginSource.GIT
              ? [
                "git",
                {
                  args: ["submodule", "deinit", "-f", PathToPlugin],
                },
              ]
              : ["unknown", {}];

          const Deinit = await run(deinitCommand, deinitCommandOptions);

          if (!Deinit.success) {
            throw new Error("We were unable to remove plugin(s)!");
          }

          const [unIndexCommand, unIndexCommandOptions] =
            PluginDetail.props.source === PluginSource.GIT
              ? [
                "git",
                {
                  args: ["rm", "-f", PathToPlugin],
                },
              ]
              : ["unknown", {}];

          const UnIndexCommand = await run(
            unIndexCommand,
            unIndexCommandOptions,
          );

          if (!UnIndexCommand.success) {
            throw new Error("We were unable to remove plugin(s)!");
          }

          await Loader.getSequence("plugins")?.set((_) => {
            _.delete(ResolvedPluginName);
            return _;
          });
        }

        await removePluginFromImportMap(ResolvedPluginName);
      }

      await updatePluginDeclarationFile();
    }

    console.info("Plugin(s) removed successfully!");

    return PluginDetails;
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

  Deno.exit();
}

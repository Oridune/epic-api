import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Confirm, Select } from "cliffy:prompt";
import {
  addPluginToImportMap,
  PluginSource,
  resolvePluginName,
  updatePluginDeclarationFile,
} from "./addPlugin.ts";
import { ISequenceDetail, Loader } from "@Core/common/loader.ts";
import { run } from "./lib/run.ts";

export const updatePlugin = async (options: {
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
                    message: "Choose the plugin to be updated",
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
          message: `Do you really want to update the plugin(s) '${
            Options.name.join(
              ", ",
            )
          }'?`,
        }))
      ) {
        return;
      }

      const PluginsDir = join(Deno.cwd(), "plugins");

      for (const PluginId of Options.name) {
        const [PluginName] = PluginId.split(":");

        const ResolvedPluginName = resolvePluginName(PluginName);

        const PluginPath = join(PluginsDir, ResolvedPluginName);

        const PluginDetail = Loader.getSequence("plugins")?.getDetailed(
          ResolvedPluginName,
        );

        if (PluginDetail) {
          PluginDetails.push(PluginDetail);

          const [command, commandOptions] =
            PluginDetail.props.source === PluginSource.GIT
              ? [
                "git",
                {
                  // Pull repository changes from Git.
                  args: ["pull", "origin", PluginDetail.props.branch].filter(
                    Boolean,
                  ),
                  cwd: PluginPath,
                },
              ]
              : ["unknown", {}];

          const UpdatePlugin = await run(command, commandOptions);

          if (!UpdatePlugin.success) {
            throw new Error("We were unable to update plugin(s)!");
          }
        }

        await addPluginToImportMap(ResolvedPluginName);
      }

      await updatePluginDeclarationFile();
    }

    console.info("Plugin(s) updated successfully!");

    return PluginDetails;
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  await Loader.load({ includeTypes: ["plugins"], sequenceOnly: true });

  await updatePlugin({
    name: name ?? n,
    prompt: true,
  });

  Deno.exit();
}

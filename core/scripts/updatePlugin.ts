import { parse } from "flags";
import { join } from "path";
import e, { ValidationException } from "validator";

import { Confirm, Select } from "cliffy:prompt";
import {
  addPluginToImportMap,
  PluginSource,
  resolvePluginName,
  setupPlugin,
  updatePluginDeclarationFile,
} from "./addPlugin.ts";
import { ISequenceDetail, Loader } from "@Core/common/loader.ts";
import { printStream } from "./lib/utility.ts";
import { existsSync } from "dfs";

export const updatePlugin = async (options: {
  name: string | string[];
  forceSync?: boolean;
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
          forceSync: e.optional(e.boolean()).default(false),
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
      ) return;

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

          const GitRepoUrl = new URL(ResolvedPluginName, "https://github.com");
          const TempPath = join(Deno.cwd(), "_temp", ResolvedPluginName);
          const Pull = existsSync(TempPath);

          const [command, commandOptions] =
            PluginDetail.props.source === PluginSource.GIT
              ? [
                "git",
                {
                  // Pull repository changes from Git.
                  args: (Pull
                    ? [
                      "pull",
                      "origin",
                      PluginDetail.props.branch,
                      "--progress",
                    ]
                    : [
                      "clone",
                      "--single-branch",
                      "--branch",
                      PluginDetail.props.branch,
                      GitRepoUrl.toString(),
                      TempPath,
                      "--progress",
                    ]).filter(
                      Boolean,
                    ),
                  cwd: Pull ? TempPath : undefined,
                  stdout: "piped" as const,
                  stderr: "piped" as const,
                },
              ]
              : ["unknown", {}];

          const Command = new Deno.Command(command, commandOptions);

          const Process = Command.spawn();

          const [Out] = await Promise.all([
            printStream(Process.stdout),
            printStream(Process.stderr),
          ]);

          const UpdatePlugin = await Process.status;

          updatePlugin: if (UpdatePlugin.success) {
            if (
              !Options.forceSync &&
              Out.find((_) => _.includes("Already up to date"))
            ) break updatePlugin;

            await setupPlugin({
              source: PluginDetail.props.source as PluginSource,
              branch: PluginDetail.props.branch,
              name: ResolvedPluginName,
              sourcePath: TempPath,
              targetPath: PluginPath,
            });

            await addPluginToImportMap(ResolvedPluginName);
          } else throw new Error("We were unable to update plugin(s)!");
        }
      }

      await updatePluginDeclarationFile();
    }

    console.info("Plugin(s) updated successfully!");

    return PluginDetails;
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  const { name, n, forceSync } = parse(Deno.args);

  await Loader.load({ includeTypes: ["plugins"], sequenceOnly: true });

  await updatePlugin({
    name: name ?? n,
    forceSync,
    prompt: true,
  });

  Deno.exit();
}

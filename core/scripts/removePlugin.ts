import { parseArgs as parse } from "flags/parse-args";
import { join } from "path";
import e, { ValidationException } from "validator";

import { ISequenceDetail, Loader, SupportedEnv } from "@Core/common/loader.ts";
import { EnvType } from "@Core/common/env.ts";
import { Confirm, Select } from "cliffy:prompt";

import { resolvePluginName, updatePluginDeclarationFile } from "./addPlugin.ts";

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
  env?: SupportedEnv;
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
          env: e.optional(e.in(Object.values(EnvType))).default(
            "global" as const,
          ),
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
      ) return PluginDetails;

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

          await Loader.getSequence("plugins")?.set((_) => {
            _.delete(ResolvedPluginName);
            return _;
          }, { env: Options.env });
        }

        await removePluginFromImportMap(ResolvedPluginName);

        await Deno.remove(PluginPath, { recursive: true });
      }

      await updatePluginDeclarationFile();
    }

    console.info("Plugin(s) removed successfully!");

    return PluginDetails;
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  const { name, n, env } = parse(Deno.args);

  await Loader.load({ includeTypes: ["plugins"], sequenceOnly: true });

  await removePlugin({
    name: name ?? n,
    env,
    prompt: true,
  });

  Deno.exit();
}

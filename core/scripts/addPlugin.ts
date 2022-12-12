import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Input } from "cliffy:prompt";
import Manager from "@Core/common/manager.ts";

export enum PluginSource {
  GIT = "git",
}

export const resolvePluginName = (name: string) =>
  name
    .split("/")
    .filter(Boolean)
    .join("/")
    .split("\\")
    .filter(Boolean)
    .join("\\");

export const addPluginToImportMap = async (name: string) => {
  const ImportMapPath = join(Deno.cwd(), "import_map.json");
  const PluginImportMapPath = join(
    Deno.cwd(),
    "plugins",
    name,
    "import_map.json"
  );

  const ImportMap = (
    await import(`file:///${ImportMapPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const TargetScope = `./plugins/${name}/`;
  ImportMap.scopes = {
    ...ImportMap.scopes,
    [TargetScope]: {
      "@Controllers/": `./plugins/${name}/controllers/`,
      "@Models/": `./plugins/${name}/models/`,
      "@Jobs/": `./plugins/${name}/jobs/`,
      "@Middlewares/": `./plugins/${name}/middlewares/`,
    },
  };

  const PluginImportMap = (
    await import(`file:///${PluginImportMapPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const ImportKeys = Object.keys(ImportMap.imports ?? {});
  const PluginImportKeys = Object.keys(PluginImportMap.imports ?? {});

  for (const Key of PluginImportKeys.filter((key) => !ImportKeys.includes(key)))
    ImportMap.scopes[TargetScope][Key] = PluginImportMap.imports?.[Key];

  await Deno.writeTextFile(
    ImportMapPath,
    JSON.stringify(ImportMap, undefined, 2)
  );
};

export const addPlugin = async (options: {
  source?: PluginSource;
  name: string | string[];
  prompt?: boolean;
}) => {
  try {
    const Options = await e
      .object(
        {
          source: e
            .optional(e.enum(Object.values(PluginSource)))
            .default(PluginSource.GIT),
          name: e
            .optional(e.array(e.string(), { cast: true, splitter: "," }))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? [
                    await Input.prompt({
                      message: "Name of the Plugin",
                    }),
                  ]
                : undefined
            ),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.name) {
      const PluginsDir = join(Deno.cwd(), "plugins");

      for (const PluginName of Options.name) {
        let ResolvePluginName = PluginName;
        let Process:
          | Deno.Process<{
              cmd: string[];
              cwd: string;
            }>
          | undefined;

        if (Options.source === PluginSource.GIT) {
          const GitRepoUrl = new URL(ResolvePluginName, "https://github.com");

          ResolvePluginName = resolvePluginName(GitRepoUrl.pathname);

          Process = Deno.run({
            cmd: ["git", "clone", GitRepoUrl.toString(), ResolvePluginName],
            cwd: PluginsDir,
          });
        }

        if (Process) {
          const Status = await Process.status();

          if (Status.success) {
            await Manager.setSequence("plugins", (seq) =>
              seq.add(ResolvePluginName)
            );

            await addPluginToImportMap(ResolvePluginName);

            for await (const Entry of Deno.readDir(
              join(PluginsDir, ResolvePluginName)
            ))
              if (
                !/controllers|models|middlewares|jobs|public|resources|templates|\.sample\.env|\.git/.test(
                  Entry.name
                )
              )
                await Deno.remove(
                  join(PluginsDir, ResolvePluginName, Entry.name),
                  {
                    recursive: true,
                  }
                );

            console.info("Plugin has been added successfully!");
          } else console.info("We were unable to add this plugin!");

          Process.close();
        } else throw new Error(`Oops! Something went wrong!`);
      }
    }
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { source, s, name, n } = parse(Deno.args);

  addPlugin({
    source: source ?? s,
    name: name ?? n,
    prompt: true,
  });
}

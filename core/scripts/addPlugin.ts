import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Input } from "cliffy:prompt";
import { Manager } from "@Core/common/manager.ts";

export enum PluginSource {
  GIT = "git",
}

export const addPlugin = async (options: {
  source?: PluginSource;
  name: string;
  prompt?: boolean;
}) => {
  try {
    const Options = await e
      .object(
        {
          source: e
            .optional(e.enum(Object.values(PluginSource)))
            .default(PluginSource.GIT),
          name: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Input.prompt({
                  message: "Name of the Plugin",
                })
              : undefined
          ),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    const PluginsDir = join(Deno.cwd(), "plugins");
    const Process =
      Options.name && Options.source === PluginSource.GIT
        ? Deno.run({
            cmd: [
              "git",
              "clone",
              new URL(Options.name, "https://github.com").toString(),
              Options.name!,
            ],
            cwd: PluginsDir,
          })
        : undefined;

    if (Process) {
      const Status = await Process.status();

      if (Status.success) {
        await Manager.setSequence("plugins", (seq) => seq.add(Options.name!));

        for await (const Entry of Deno.readDir(join(PluginsDir, Options.name!)))
          if (
            !/controllers|middlewares|jobs|public|resources|templates|\.sample\.env|\.git/.test(
              Entry.name
            )
          )
            await Deno.remove(join(PluginsDir, Options.name!, Entry.name), {
              recursive: true,
            });

        console.info("Plugin has been added successfully!");
      } else console.info("We were unable to add this plugin!");

      Process.close();
    } else throw new Error(`Oops! Something went wrong!`);
  } catch (error) {
    console.error(error, error.issues);
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

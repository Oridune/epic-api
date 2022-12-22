import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Input, Select } from "cliffy:prompt";
import { plural, singular } from "pluralize";
import {
  pascalCase,
  camelCase,
  snakeCase,
  paramCase,
  pathCase,
} from "stringcase/mod.ts";
import Manager from "@Core/common/manager.ts";
import { ModuleType } from "@Core/scripts/createModule.ts";

export const renameModule = async (options: {
  type: ModuleType;
  name: string;
  rename?: string;
  prompt?: boolean;
}) => {
  try {
    const Options = await e
      .object(
        {
          type: e
            .optional(e.enum(Object.values(ModuleType)))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? ((await Select.prompt({
                    message: "What is the module type?",
                    options: Object.values(ModuleType),
                  })) as ModuleType)
                : undefined
            ),
          name: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Select.prompt({
                  message: "Choose the module to be renamed",
                  options: Array.from(
                    await Manager.getSequence(plural(ctx.parent!.output.type))
                  ),
                })
              : undefined
          ),
          rename: e
            .optional(e.string().matches(/^(-?[a-zA-Z0-9]+)+$/))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? ((await Input.prompt({
                    message: "What is the new name of module?",
                    validate: (value) => /^(-?([a-zA-Z0-9]+))+$/.test(value),
                  })) as string)
                : undefined
            ),
          moduleDir: e.any().custom((ctx) => plural(ctx.parent!.output.type)),
          modulePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.moduleDir,
                ctx.parent!.output.name
              )
            ),
          newModulePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.moduleDir,
                ctx.parent!.output.name.replace(
                  /(-?[a-zA-Z0-9]+)+(\.(-?[a-zA-Z0-9]+)+)?$/,
                  `${ctx.parent?.output.rename}$2`
                )
              )
            ),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.type && Options.name && Options.rename) {
      const Content = (await Deno.readTextFile(Options.modulePath))
        .replaceAll(plural(Options.name), plural(Options.rename))
        .replaceAll(Options.name, Options.rename)
        .replaceAll(singular(Options.name), singular(Options.rename))
        .replaceAll(pascalCase(Options.name), pascalCase(Options.rename))
        .replaceAll(camelCase(Options.name), camelCase(Options.rename))
        .replaceAll(snakeCase(Options.name), snakeCase(Options.rename))
        .replaceAll(paramCase(Options.name), paramCase(Options.rename))
        .replaceAll(pathCase(Options.name), pathCase(Options.rename));

      await Deno.writeTextFile(Options.newModulePath, Content);
      await Deno.remove(Options.modulePath);
      await Manager.setSequence(Options.moduleDir, (seq) => {
        seq.delete(Options.name!);
        return seq.add(Options.rename!);
      });
    }

    console.info("Module has been renamed successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n, rename } = parse(Deno.args);

  renameModule({
    type: type ?? t,
    name: name ?? n,
    rename,
    prompt: true,
  });
}

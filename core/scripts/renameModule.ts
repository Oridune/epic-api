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
  module: string;
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
          module: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Select.prompt({
                  message: "Choose the module to be renamed",
                  options: Array.from(
                    await Manager.getSequence(plural(ctx.parent!.output.type))
                  ),
                })
              : undefined
          ),
          name: e
            .any()
            .custom(
              (ctx) =>
                ctx.parent?.output.module.split(".").slice(-2, -1)[0] ??
                ctx.parent?.output.module
            ),
          rename: e
            .optional(e.string().matches(/^[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*$/))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? ((await Input.prompt({
                    message: "What is the new name of module?",
                    validate: (value) =>
                      /^[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*$/.test(value),
                  })) as string)
                : undefined
            ),
          newModule: e.any().custom((ctx) => {
            const Parts: string[] = ctx.parent?.output.module.split(".");
            return Parts.length > 1
              ? [
                  ...(Parts.length > 2 ? Parts.slice(0, -2) : []),
                  ctx.parent?.output.rename,
                  ...Parts.slice(-1),
                ].join(".")
              : ctx.parent?.output.rename;
          }),
          moduleDir: e.any().custom((ctx) => plural(ctx.parent!.output.type)),
          modulePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.moduleDir,
                ctx.parent!.output.module
              )
            ),
          newModulePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.moduleDir,
                ctx.parent!.output.newModule
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

      if (Options.modulePath !== Options.newModulePath) {
        await Manager.setSequence(Options.moduleDir, (seq) => {
          seq.delete(Options.module!);
          return seq.add(Options.newModule!);
        });

        await Deno.remove(Options.modulePath);
      }
    }

    console.info("Module has been renamed successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, module, m, rename } = parse(Deno.args);

  renameModule({
    type: type ?? t,
    module: module ?? m,
    rename,
    prompt: true,
  });
}

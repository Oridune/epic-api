import { parse } from "flags";
import { join, basename } from "path";
import { exists } from "fs";
import e from "validator";

import { Input, Select, Confirm } from "cliffy:prompt";
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

export const createTemplate = async (options: {
  type: ModuleType;
  name: string;
  content: string;
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
                    message: "What is the template type?",
                    options: Object.values(ModuleType),
                  })) as ModuleType)
                : undefined
            ),
          name: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? ((await Input.prompt({
                  message:
                    "What is the name of template? (In a filename format.)",
                })) as string)
              : undefined
          ),
          content: e.optional(e.string()),
          templateDir: e.optional(e.string()).default("templates"),
          templatePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.templateDir,
                `${ctx.parent!.output.type}.${ctx.parent!.output.name}`
              )
            ),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.type && Options.name) {
      const TemplateName = basename(Options.templatePath);

      if (
        options.prompt &&
        (await exists(Options.templatePath)) &&
        !(await Confirm.prompt({
          message: `Are you sure you want to re-create the template '${TemplateName}'?`,
        }))
      )
        return;

      const Content = (Options.content ?? "")
        .replaceAll("$_namePascal", pascalCase(Options.name))
        .replaceAll("$_nameCamel", camelCase(Options.name))
        .replaceAll("$_nameSnake", snakeCase(Options.name))
        .replaceAll("$_nameKebab", paramCase(Options.name))
        .replaceAll("$_namePath", pathCase(Options.name))
        .replaceAll("$_namePlural", plural(Options.name))
        .replaceAll("$_nameSingular", singular(Options.name))
        .replaceAll("$_name", Options.name);

      await Deno.writeTextFile(Options.templatePath, Content);
      await Manager.setSequence(Options.templateDir, (seq) =>
        seq.add(TemplateName)
      );
    }

    console.info("Template has been created successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n, content, c } = parse(Deno.args);

  createTemplate({
    type: type ?? t,
    name: name ?? n,
    content: content ?? c,
    prompt: true,
  });
}

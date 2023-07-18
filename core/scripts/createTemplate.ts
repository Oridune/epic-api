import { parse } from "flags";
import { join, dirname, basename } from "path";
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
import { Loader } from "@Core/common/loader.ts";
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
                    "What is the name of template? (Full file name. E.g: blank.ts)",
                })) as string)
              : undefined
          ),
          content: e.optional(e.string()),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.type && Options.name) {
      const TemplatePath = join(
        Deno.cwd(),
        "templates",
        `${Options.type}.${Options.name}`
      );
      const TemplateDir = dirname(TemplatePath);
      const TemplateName = basename(TemplatePath);

      if (
        options.prompt &&
        (await exists(TemplatePath)) &&
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

      if (!(await exists(TemplateDir)))
        await Deno.mkdir(TemplateDir, { recursive: true });

      await Deno.writeTextFile(TemplatePath, Content);
      await Loader.getSequence("templates")?.set((_) => _.add(TemplateName));
    }

    console.info("Template has been created successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n, content, c } = parse(Deno.args);

  await Loader.load({ includeTypes: ["templates"], sequenceOnly: true });

  await createTemplate({
    type: type ?? t,
    name: name ?? n,
    content: content ?? c,
    prompt: true,
  });
}

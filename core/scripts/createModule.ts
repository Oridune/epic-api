import { parse } from "flags";
import { join } from "path";
import { existsSync } from "dfs";
import e, { ValidationException } from "validator";

import { Confirm, Input, Select } from "cliffy:prompt";
import { plural, singular } from "pluralize";
import {
  camelCase,
  paramCase,
  pascalCase,
  pathCase,
  snakeCase,
} from "stringcase/mod.ts";
import { Loader, SupportedEnv } from "@Core/common/loader.ts";
import { EnvType } from "@Core/common/env.ts";
import { ejsRender } from "@Core/scripts/lib/ejsRender.ts";

export enum ModuleType {
  CONTROLLER = "controller",
  MODEL = "model",
  JOB = "job",
  MIDDLEWARE = "middleware",
  HOOK = "hook",
  LOCALE = "locale",
}

export const listValidTemplates = (templates: string[], type: string) =>
  templates
    .filter((name) => new RegExp(`^${type}\\..+`).test(name))
    .map((name) => name.replace(new RegExp(`^${type}\\.`), ""));

export const createModule = async (options: {
  env?: SupportedEnv;
  type: ModuleType;
  name: string;
  parent?: string;
  template?: string;
  templateDir?: string;
  prompt?: boolean;
}) => {
  try {
    const Templates = Array.from(
      Loader.getSequence("templates")?.includes() ?? [],
    );

    const Options = await e
      .object(
        {
          env: e.optional(e.in(Object.values(EnvType))).default(
            "global" as const,
          ),
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
          name: e
            .optional(e.string().matches(/^[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*$/))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? ((await Input.prompt({
                  message: "What is the name of module?",
                  validate: (value) =>
                    /^[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*$/.test(value),
                })) as string)
                : undefined
            ),
          template: e
            .optional(
              e.in((ctx) =>
                listValidTemplates(Templates, ctx.parent!.output.type)
              ),
            )
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? await Select.prompt({
                  message: "Choose a template",
                  options: listValidTemplates(
                    Templates,
                    ctx.parent!.output.type,
                  ),
                })
                : undefined
            ),
          moduleDirName: e
            .any()
            .custom((ctx) => plural(ctx.parent!.output.type)),
          module: e
            .any()
            .custom((ctx) =>
              [
                ctx.parent!.output.name,
                ctx.parent!.output.template.split(".")[1],
              ].join(".")
            ),
          moduleDir: e
            .any()
            .custom((ctx) =>
              join(Deno.cwd(), ctx.parent!.output.moduleDirName)
            ),
          modulePath: e
            .any()
            .custom((ctx) =>
              join(ctx.parent!.output.moduleDir, ctx.parent!.output.module)
            ),
          templatePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                "templates",
                `${ctx.parent!.output.type}.${ctx.parent!.output.template}`,
              )
            ),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    if (Options.type && Options.name) {
      if (
        options.prompt &&
        existsSync(Options.modulePath) &&
        !(await Confirm.prompt({
          message:
            `Are you sure you want to re-create the module '${Options.name}'?`,
        }))
      ) {
        return;
      }

      const RawContent = await Deno.readTextFile(Options.templatePath);

      const Content = /\.ejs$/.test(Options.templatePath)
        ? await ejsRender(RawContent, Options)
        : RawContent.replaceAll("$_namePascal", pascalCase(Options.name))
          .replaceAll("$_nameCamel", camelCase(Options.name))
          .replaceAll("$_nameSnake", snakeCase(Options.name))
          .replaceAll("$_nameKebab", paramCase(Options.name))
          .replaceAll("$_namePath", pathCase(Options.name))
          .replaceAll("$_namePlural", plural(Options.name))
          .replaceAll("$_nameSingular", singular(Options.name))
          .replaceAll("$_name", Options.name);

      await Deno.mkdir(Options.moduleDir, { recursive: true }).catch(() => {
        // Do nothing...
      });

      await Deno.writeTextFile(Options.modulePath, Content);
      await Loader.getSequence(plural(Options.type))?.set(
        (_) => _.add(Options.module),
        { env: Options.env },
      );
    } else {
      throw new Error(
        `We couldn't create that module! The type or name is missing.`,
      );
    }

    console.info("Module has been created successfully!");
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n, parent, p, template, env } = parse(Deno.args);

  await Loader.load({ excludeTypes: ["plugins"], sequenceOnly: true });

  await createModule({
    type: type ?? t,
    name: name ?? n,
    parent: parent ?? p,
    template,
    env,
    prompt: true,
  });

  Deno.exit();
}

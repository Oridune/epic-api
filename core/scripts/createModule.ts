import { parse } from "flags";
import { join } from "path";
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

export enum ModuleType {
  CONTROLLER = "controller",
  MODEL = "model",
  JOB = "job",
  MIDDLEWARE = "middleware",
}

export const listTemplates = async (path: string, type: string) =>
  Array.from(await Manager.getSequence(path))
    .filter((name) => new RegExp(`^${type}\\..+`).test(name))
    .map((name) => name.replace(new RegExp(`^${type}\\.`), ""));

export const createModule = async (options: {
  type: ModuleType;
  name: string;
  parent?: string;
  template?: string;
  templateDir?: string;
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
          parent: e
            .optional(
              e.in(async (ctx) =>
                ctx.parent!.output.type === "controller"
                  ? Array.from(await Manager.getSequence("controllers"))
                  : []
              )
            )
            .default(async (ctx) => {
              const Parent =
                ctx.parent!.input.prompt &&
                ctx.parent!.output.type === "controller"
                  ? await Select.prompt({
                      message: "Choose a parent controller",
                      options: [
                        "none",
                        ...(await Manager.getSequence("controllers")),
                      ],
                    })
                  : undefined;

              return Parent === "none" ? undefined : Parent;
            }),
          templateDir: e.optional(e.string()).default("templates"),
          template: e
            .optional(
              e.in((ctx) =>
                listTemplates(
                  ctx.parent!.output.templateDir,
                  ctx.parent!.output.type
                )
              )
            )
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? await Select.prompt({
                    message: "Choose a template",
                    options: await listTemplates(
                      ctx.parent!.output.templateDir,
                      ctx.parent!.output.type
                    ),
                  })
                : undefined
            ),
          moduleDir: e.any().custom((ctx) => plural(ctx.parent!.output.type)),
          module: e.any().custom((ctx) => {
            const Parent = ctx.parent!.output.parent?.split(".");
            Parent?.pop();

            return [
              Parent?.join("."),
              ctx.parent!.output.name,
              ctx.parent!.output.template.split(".").pop(),
            ]
              .filter(Boolean)
              .join(".");
          }),
          modulePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.moduleDir,
                ctx.parent!.output.module
              )
            ),
          templatePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                ctx.parent!.output.templateDir,
                `${ctx.parent!.output.type}.${ctx.parent!.output.template}`
              )
            ),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.name) {
      if (
        options.prompt &&
        (await exists(Options.modulePath)) &&
        !(await Confirm.prompt({
          message: `Are you sure you want to re-create the module '${Options.name}'?`,
        }))
      )
        return;

      const Content = (await Deno.readTextFile(Options.templatePath))
        .replaceAll("$_namePascal", pascalCase(Options.name))
        .replaceAll("$_nameCamel", camelCase(Options.name))
        .replaceAll("$_nameSnake", snakeCase(Options.name))
        .replaceAll("$_nameKebab", paramCase(Options.name))
        .replaceAll("$_namePath", pathCase(Options.name))
        .replaceAll("$_namePlural", plural(Options.name))
        .replaceAll("$_nameSingular", singular(Options.name))
        .replaceAll("$_name", Options.name);

      await Deno.writeTextFile(Options.modulePath, Content);
      await Manager.setSequence(Options.moduleDir, (seq) =>
        seq.add(Options.module)
      );
    }

    console.info("Module has been created successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n, parent, p, template } = parse(Deno.args);

  createModule({
    type: type ?? t,
    name: name ?? n,
    parent: parent ?? p,
    template,
    prompt: true,
  });
}

import { parse } from "flags";
import { basename, join } from "path";
import e from "validator";

import { listValidTemplates, ModuleType } from "@Core/scripts/createModule.ts";
import { Confirm, Select } from "cliffy:prompt";
import { Loader } from "@Core/common/loader.ts";

export const deleteTemplate = async (options: {
  type: ModuleType;
  name: string;
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
              ? await Select.prompt({
                message: "Choose the template to be deleted",
                options: listValidTemplates(
                  Array.from(
                    Loader.getSequence("templates")?.includes() ?? [],
                  ),
                  ctx.parent!.output.type,
                ),
              })
              : undefined
          ),
          templatePath: e
            .any()
            .custom((ctx) =>
              join(
                Deno.cwd(),
                "templates",
                `${ctx.parent!.output.type}.${ctx.parent!.output.name}`,
              )
            ),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    if (Options.type && Options.name) {
      const TemplateName = basename(Options.templatePath);

      if (
        options.prompt &&
        !(await Confirm.prompt({
          message:
            `Do you really want to delete the template '${TemplateName}'?`,
        }))
      ) {
        return;
      }

      await Deno.remove(Options.templatePath);
      await Loader.getSequence("templates")?.set((_) => {
        _.delete(TemplateName);
        return _;
      });
    }

    console.info("Template has been deleted successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n } = parse(Deno.args);

  await Loader.load({ includeTypes: ["templates"], sequenceOnly: true });

  await deleteTemplate({
    type: type ?? t,
    name: name ?? n,
    prompt: true,
  });

  Deno.exit();
}

import { parse } from "flags";
import { join, basename } from "path";
import e from "validator";

import { listTemplates, ModuleType } from "@Core/scripts/createModule.ts";
import { Select, Confirm } from "cliffy:prompt";
import Manager from "@Core/common/manager.ts";

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
          templateDir: e.optional(e.string()).default("templates"),
          name: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Select.prompt({
                  message: "Choose the template to be deleted",
                  options: await listTemplates(
                    ctx.parent!.output.templateDir,
                    ctx.parent!.output.type
                  ),
                })
              : undefined
          ),
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
        !(await Confirm.prompt({
          message: `Do you really want to delete the template '${TemplateName}'?`,
        }))
      )
        return;

      await Deno.remove(Options.templatePath);

      await Manager.setSequence(Options.templateDir, (seq) => {
        seq.delete(TemplateName);
        return seq;
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

  deleteTemplate({
    type: type ?? t,
    name: name ?? n,
    prompt: true,
  });
}

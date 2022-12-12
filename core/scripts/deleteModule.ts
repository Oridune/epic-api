import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { ModuleType } from "@Core/scripts/createModule.ts";
import { Select, Confirm } from "cliffy:prompt";
import { plural } from "pluralize";
import Manager from "@Core/common/manager.ts";

export const deleteModule = async (options: {
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
                    message: "What is the module type?",
                    options: Object.values(ModuleType),
                  })) as ModuleType)
                : undefined
            ),
          name: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Select.prompt({
                  message: "Choose the module to be deleted",
                  options: Array.from(
                    await Manager.getSequence(plural(ctx.parent!.output.type))
                  ),
                })
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
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    if (Options.name) {
      if (
        options.prompt &&
        !(await Confirm.prompt({
          message: `Do you really want to delete the ${Options.type} '${Options.name}'?`,
        }))
      )
        return;

      await Deno.remove(Options.modulePath);

      await Manager.setSequence(Options.moduleDir, (seq) => {
        seq.delete(Options.name!);
        return seq;
      });
    }

    console.info("Module has been deleted successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n } = parse(Deno.args);

  deleteModule({
    type: type ?? t,
    name: name ?? n,
    prompt: true,
  });
}

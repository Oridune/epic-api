import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Loader, SupportedEnv } from "@Core/common/loader.ts";
import { EnvType } from "@Core/common/env.ts";
import { ModuleType } from "@Core/scripts/createModule.ts";
import { Confirm, Select } from "cliffy:prompt";
import { plural } from "pluralize";

export const deleteModule = async (options: {
  env?: SupportedEnv;
  type: ModuleType;
  name: string;
  prompt?: boolean;
}) => {
  try {
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
          name: e.optional(e.string()).default(async (ctx) =>
            ctx.parent!.input.prompt
              ? await Select.prompt({
                message: "Choose the module to be deleted",
                options: Array.from(
                  Loader.getSequence(
                    plural(ctx.parent!.output.type),
                  )?.includes({ env: ctx.parent!.output.env }) ?? [],
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
                ctx.parent!.output.name,
              )
            ),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    if (Options.type && Options.name) {
      if (
        options.prompt &&
        !(await Confirm.prompt({
          message:
            `Do you really want to delete the ${Options.type} '${Options.name}'?`,
        }))
      ) {
        return;
      }

      await Deno.remove(Options.modulePath).catch(console.error);
      await Loader.getSequence(plural(Options.type))?.set((_) => {
        _.delete(Options.name!);
        return _;
      }, { env: Options.env });
    } else {
      throw new Error(
        `We couldn't delete that module! The type or name is missing.`,
      );
    }

    console.info("Module has been deleted successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { type, t, name, n, env } = parse(Deno.args);

  await Loader.load({
    excludeTypes: ["plugins", "templates"],
    sequenceOnly: true,
  });

  await deleteModule({
    type: type ?? t,
    name: name ?? n,
    env,
    prompt: true,
  });

  Deno.exit();
}

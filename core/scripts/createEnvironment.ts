import { parse } from "flags";
import { join } from "path";
import { exists } from "fs";
import e from "validator";

import { Confirm } from "cliffy:prompt";
import { EnvType } from "@Core/common/env.ts";

export const createEnvironment = async (options: {
  types: string;
  content: string;
  variables: Record<string, string>;
  prompt?: boolean;
}) => {
  try {
    const Options = await e
      .object(
        {
          types: e.array(e.in(Object.values(EnvType)), {
            cast: true,
            splitter: ",",
          }),
          content: e
            .optional(e.string())
            .default(() => Deno.readTextFile(join(Deno.cwd(), ".sample.env"))),
          variables: e.record(e.or([e.string(), e.number()])),
        },
        { allowUnexpectedProps: true }
      )
      .validate(options);

    const EnvironmentDir = join(Deno.cwd(), "./env/");
    const GlobalEnvironmentFilePath = join(EnvironmentDir, ".env");

    if (!(await exists(EnvironmentDir)))
      await Deno.mkdir(EnvironmentDir, { recursive: true });

    if (!(await exists(GlobalEnvironmentFilePath)))
      await Deno.writeTextFile(
        GlobalEnvironmentFilePath,
        "# Put your global environment variables here."
      );

    for (const Type of Options.types) {
      const EnvironmentFileName = `.${Type}.env`;
      const EnvironmentFilePath = join(EnvironmentDir, EnvironmentFileName);

      if (
        options.prompt &&
        (await exists(EnvironmentFilePath)) &&
        !(await Confirm.prompt({
          message: `Are you sure you want to re-create the environment file '${EnvironmentFileName}'?`,
        }))
      )
        return;

      const Content = Object.keys(Options.variables).reduce(
        (content, key) =>
          ["string", "number"].includes(typeof Options.variables[key])
            ? content.replace(
                new RegExp(`{{\\s*${key}\\s*}}`, "g"),
                Options.variables[key].toString()
              )
            : content,
        Options.content
      );

      await Deno.writeTextFile(
        EnvironmentFilePath,
        Content.replace(/# This file is just a sample.*/, "").trim()
      );
    }

    console.info("Environment(s) created successfully!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { _, types, t, content, c, ...Variables } = parse(Deno.args);

  await createEnvironment({
    types: types ?? t,
    content: content ?? c,
    variables: Variables,
    prompt: true,
  });
}

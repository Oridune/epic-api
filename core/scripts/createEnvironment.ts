import { parse } from "flags";
import { join } from "path";
import { existsSync } from "dfs";
import e, { ValidationException } from "validator";

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
          variables: e.record(e.or([e.number(), e.string()])),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    const EnvironmentDir = join(Deno.cwd(), "./env/");
    const GlobalEnvironmentFilePath = join(EnvironmentDir, ".env");

    await Deno.mkdir(EnvironmentDir, { recursive: true }).catch(() => {
      // Do nothing...
    });

    if (!existsSync(GlobalEnvironmentFilePath)) {
      await Deno.writeTextFile(
        GlobalEnvironmentFilePath,
        "# Put your global environment variables here.",
      );
    }

    // Generate a 30 character random string
    const RandomString = [...crypto.getRandomValues(new Uint32Array(30))]
      .map((v) => (v % 36).toString(36))
      .join("");

    for (const Type of Options.types) {
      const EnvironmentFileName = `.${Type}.env`;
      const EnvironmentFilePath = join(EnvironmentDir, EnvironmentFileName);

      if (
        options.prompt &&
        existsSync(EnvironmentFilePath) &&
        !(await Confirm.prompt({
          message:
            `Are you sure you want to re-create the environment file '${EnvironmentFileName}'?`,
        }))
      ) {
        return;
      }

      // Prepare variables for injection...
      const Variables = {
        envType: Type,
        port: 3742,
        randomString: RandomString,
        ...Options.variables,
      };

      // Inject variables
      const Content = Object.entries(Variables).reduce(
        (content, [key, value]) =>
          ["string", "number"].includes(typeof value)
            ? content.replace(
              new RegExp(`{{\\s*${key}\\s*}}`, "g"),
              value.toString(),
            )
            : content,
        Options.content,
      );

      await Deno.writeTextFile(
        EnvironmentFilePath,
        Content.replace(/# This file is just a sample.*/, "").replace(
          /{{\s*(\w+)\s*}}/g,
          "",
        ).trim(),
      );
    }

    console.info("Environment(s) created successfully!");
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

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

  Deno.exit();
}

import { parseArgs as parse } from "flags/parse-args";
import { join } from "path";
import { exists } from "dfs";
import e, { ValidationException } from "validator";

import { Loader } from "@Core/common/mod.ts";
import { Confirm, Input } from "cliffy:prompt";
import { exec } from "@Core/scripts/lib/run.ts";
import { writeJSONFile } from "@Core/scripts/lib/utility.ts";

import { createDenoJSON, generateSDK } from "@Core/scripts/generateDenoSDK.ts";

export const generateSDKExtension = async (options: {
  name: string;
  version: string;
  apiVersion?: string;
  prompt?: boolean;
}) => {
  try {
    const namePattern = /^[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*$/;

    const Options = await e
      .object(
        {
          name: e.optional(e.string().matches(namePattern)).default(async () =>
            options.prompt
              ? await Input.prompt({
                message: "Enter the extension name:",
                validate: (value) => namePattern.test(value),
              })
              : undefined
          ),
          version: e.string(),
          apiVersion: e.optional(e.string()).default("latest"),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    if (Options.name) {
      const SDKName = `sdk@${Options.version}`;

      const ExtensionDir = join(Deno.cwd(), `sdk-extensions/${Options.name}`);

      if (await exists(ExtensionDir)) {
        throw new Error(`SDK extension already exists: ${ExtensionDir}`);
      }

      await Deno.mkdir(ExtensionDir, { recursive: true }).catch(
        () => {
          // Do nothing...
        },
      );

      const DenoJSON = createDenoJSON({
        name: `${Options.name}-extension`,
        ...(Options.version === "latest" ? {} : { version: Options.version }),
        exports: {
          ".": "./entry.ts",
        },
        imports: {
          "epic-api-sdk": `../../public/${SDKName}/www/index.ts`,
        },
      });

      await writeJSONFile(
        join(ExtensionDir, "deno.json"),
        DenoJSON,
      );

      await Deno.writeTextFile(
        join(ExtensionDir, "entry.ts"),
        (`
          /**
           * This SDK extension is used within SDK generation process
           * You cannot import any files from the epic api or any of its sources here cause it will not work.
           * Your code should be isolated in the this/current folder.
           * 
           */

          import { EpicSDK } from "epic-api-sdk";

          export class ${Options.name}Entry {}
        `).trim().split("\n").map(($) => $.trim()).join("\n"),
      );

      console.info("Generated SDK extension!", ExtensionDir);

      if (options.prompt && await Confirm.prompt("Do you want to open code?")) {
        await exec("code .", { cwd: ExtensionDir });
      }
    }
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  const { name, n, version, v, skipGenerateSDK, apiVersion } = parse(Deno.args);

  if (!skipGenerateSDK) {
    await Loader.load({ includeTypes: ["controllers", "plugins", "public"] });

    await generateSDK({
      version: version ?? v,
      apiVersion,
    });
  }

  await generateSDKExtension({
    name: name ?? n,
    version: version ?? v,
    apiVersion,
    prompt: true,
  });

  Deno.exit();
}

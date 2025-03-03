import { parseArgs as parse } from "flags/parse-args";
import { join } from "path";
import { exists } from "dfs";
import e, { ValidationException } from "validator";

import { Loader } from "@Core/common/mod.ts";
import { Confirm, Input } from "cliffy:prompt";
import { exec } from "@Core/scripts/lib/run.ts";

import {
  createPackageJSON,
  createTsConfigJSON,
  generateSDK,
  writeJSONFile,
} from "@Core/scripts/generateSDK.ts";

export const generateSDKExtension = async (options: {
  name: string;
  version?: string;
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
          version: e.optional(e.string()).default("latest"),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    if (Options.name) {
      const SDKName = `sdk@${Options.version}`;
      const SDKDir = join(Deno.cwd(), `public/${SDKName}/`);

      const ExtensionDir = join(Deno.cwd(), `sdk-extensions/${Options.name}`);
      const ExtensionSrc = join(ExtensionDir, "src");

      if (await exists(ExtensionDir)) {
        throw new Error(`SDK extension already exists: ${ExtensionDir}`);
      }

      await Deno.mkdir(ExtensionSrc, { recursive: true }).catch(
        () => {
          // Do nothing...
        },
      );

      const PackageJSON = createPackageJSON({
        name: Options.name,
        version: Options.version,
      });

      const TsConfigJSON = createTsConfigJSON();

      await Promise.all([
        writeJSONFile(
          join(ExtensionDir, "package.json"),
          PackageJSON,
        ),
        writeJSONFile(
          join(ExtensionDir, "tsconfig.json"),
          TsConfigJSON,
        ),
      ]);

      await exec(`npm i -D ${SDKDir}`, { cwd: ExtensionDir });

      await Deno.writeTextFile(
        join(ExtensionSrc, "README.md"),
        (`
          This SDK extension is used within SDK generation process
          You cannot import any files from the epic api or any of its sources here cause it will not work.
          Your code should be written in a frontend library context.
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
  const { name, n, version, v, skipGenerateSDK } = parse(Deno.args);

  if (!skipGenerateSDK) {
    await Loader.load({ includeTypes: ["controllers", "plugins", "public"] });

    await generateSDK({
      version: version ?? v,
    });
  }

  await generateSDKExtension({
    name: name ?? n,
    version: version ?? v,
    prompt: true,
  });

  Deno.exit();
}

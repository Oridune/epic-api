import { parse } from "flags";
import { join, dirname } from "path";
import { deepMerge } from "collections/deep_merge.ts";
import { expandGlob, exists } from "fs";
import e from "validator";

import { Confirm } from "cliffy:prompt";

export const mergeConfig = async (dir: string) => {
  const TempConfigPath = join(dir, "deno.json");
  const MainConfigPath = join(Deno.cwd(), "deno.json");

  const TempConfig = (
    await import(`file:///${TempConfigPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const MainConfig = (
    await import(`file:///${MainConfigPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const ResultConfig = deepMerge(MainConfig, TempConfig);

  delete ResultConfig.id;
  delete ResultConfig.version;
  delete ResultConfig.name;
  delete ResultConfig.description;
  delete ResultConfig.homepage;
  delete ResultConfig.icon;
  delete ResultConfig.author;
  delete ResultConfig.keywords;
  delete ResultConfig.donate;

  await Deno.writeTextFile(
    MainConfigPath,
    JSON.stringify(
      {
        ...MainConfig,
        ...ResultConfig,
      },
      undefined,
      2
    )
  );
};

export const mergeImports = async (dir: string) => {
  const TempImportsPath = join(dir, "import_map.json");
  const MainImportsPath = join(Deno.cwd(), "import_map.json");

  const TempImports = (
    await import(`file:///${TempImportsPath}`, {
      assert: { type: "json" },
    })
  ).default;

  const MainImports = (
    await import(`file:///${MainImportsPath}`, {
      assert: { type: "json" },
    })
  ).default;

  await Deno.writeTextFile(
    MainImportsPath,
    JSON.stringify(deepMerge(MainImports, TempImports), undefined, 2)
  );
};

export const updateCore = async (options: {
  branch?: string;
  prompt?: boolean;
}) => {
  try {
    const Options = await e
      .object(
        { branch: e.optional(e.string()).default("master") },
        { allowUnexpectedProps: true }
      )
      .validate(options);
    if (
      options.prompt &&
      !(await Confirm.prompt({
        message: `Updating the core will overwrite any changes made to the core and template files! Are you sure you want to continue?`,
      }))
    )
      return;

    const GitRepoUrl = new URL("Oridune/epic-api", "https://github.com");
    const TempPath = join(Deno.cwd(), "_temp");

    if (await exists(TempPath))
      await Deno.remove(TempPath, { recursive: true });

    const Process = Deno.run({
      cmd: [
        "git",
        "clone",
        "--single-branch",
        "--branch",
        Options.branch,
        GitRepoUrl.toString(),
        TempPath,
      ],
    });

    const Status = await Process.status();

    if (Status.success) {
      Process.close();

      // Create Files
      for (const Glob of ["**/**/*"].map((pattern) =>
        expandGlob(pattern, {
          root: TempPath,
          globstar: true,
        })
      ))
        for await (const Entry of Glob)
          if (!Entry.isDirectory) {
            const SourcePath = Entry.path;
            const TargetPath = Entry.path.replace(TempPath, Deno.cwd());
            const TargetDirectory = dirname(TargetPath);

            if (await exists(TargetPath)) continue;

            await Deno.mkdir(TargetDirectory, { recursive: true }).catch(() => {
              // Do nothing...
            });

            await Deno.copyFile(SourcePath, TargetPath);
          }

      // Create/Update Files
      for (const Glob of [
        "core/**/*",
        "docs/**/*",
        "templates/**/*",
        "serve.ts",
      ].map((pattern) =>
        expandGlob(pattern, {
          root: TempPath,
          globstar: true,
        })
      ))
        for await (const Entry of Glob)
          if (!Entry.isDirectory) {
            const SourcePath = Entry.path;
            const TargetPath = Entry.path.replace(TempPath, Deno.cwd());
            const TargetDirectory = dirname(TargetPath);

            await Deno.mkdir(TargetDirectory, { recursive: true }).catch(() => {
              // Do nothing...
            });

            await Deno.copyFile(SourcePath, TargetPath);
          }

      // Update Docs File
      await Deno.copyFile(
        join(TempPath, "README.md"),
        join(Deno.cwd(), "new.README.md")
      );

      await mergeConfig(TempPath);
      await mergeImports(TempPath);

      // Sleep for 1s
      await new Promise((_) => setTimeout(_, 3000));

      await Deno.remove(TempPath, { recursive: true });

      console.info("Core has been updated successfully!");
    } else {
      Process.close();
      throw new Error("We were unable to update the core!");
    }
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { branch, b } = parse(Deno.args);

  await updateCore({
    branch: branch ?? b,
    prompt: true,
  });
}

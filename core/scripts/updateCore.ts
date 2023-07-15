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

      // Create/Update Files
      for (const Glob of ["core/**/*", "templates/**/*"].map((pattern) =>
        expandGlob(pattern, {
          root: TempPath,
          globstar: true,
        })
      ))
        for await (const Entry of Glob)
          if (!Entry.isDirectory)
            await Deno.copyFile(
              Entry.path,
              Entry.path.replace(TempPath, Deno.cwd())
            );

      // Create Files
      for (const Glob of ["tests/**/*", "*.*"].map((pattern) =>
        expandGlob(pattern, {
          root: TempPath,
          globstar: true,
        })
      ))
        for await (const Entry of Glob) {
          const TargetFile = Entry.path.replace(TempPath, Deno.cwd());
          if (!Entry.isDirectory && !(await exists(TargetFile))) {
            const Directory = dirname(TargetFile);

            if (!(await exists(Directory)))
              await Deno.mkdir(Directory, { recursive: true });

            await Deno.copyFile(Entry.path, TargetFile);
          }
        }

      // Update Docs File
      await Deno.copyFile(
        join(TempPath, "README.md"),
        join(Deno.cwd(), "new.README.md")
      );

      await mergeConfig(TempPath);
      await mergeImports(TempPath);

      // Sleep for 1s
      await new Promise((_) => setTimeout(_, 1000));

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

  updateCore({
    branch: branch ?? b,
    prompt: true,
  });
}

import { parse } from "flags";
import { join } from "path";
import { deepMerge } from "collections";
import { expandGlob } from "fs";
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

  await Deno.writeTextFile(
    MainConfigPath,
    JSON.stringify(deepMerge(MainConfig, TempConfig), undefined, 2)
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
        message: `Updating the core will overwrite any changes made to the core files! Are you sure you want to continue?`,
      }))
    )
      return;

    const GitRepoUrl = new URL("Oridune/epic-api", "https://github.com");
    const TempPath = join(Deno.cwd(), "_");
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
      // Core Files
      for await (const Entry of expandGlob("core/**/*", {
        root: TempPath,
      }))
        if (!Entry.isDirectory)
          Deno.copyFile(Entry.path, Entry.path.replace(TempPath, Deno.cwd()));

      // Template Files
      for await (const Entry of expandGlob("templates/**/*", {
        root: TempPath,
      }))
        if (!Entry.isDirectory)
          Deno.copyFile(Entry.path, Entry.path.replace(TempPath, Deno.cwd()));

      await mergeConfig(TempPath);
      await mergeImports(TempPath);

      await Deno.remove(TempPath, { recursive: true });

      console.info("Core has been updated successfully!");
    } else console.info("We were unable to update the core!");

    Process.close();
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

import { parse } from "flags";
import { dirname, join } from "path";
import { deepMerge } from "collections/deep_merge.ts";
import { existsSync, expandGlob } from "dfs";
import e from "validator";

import { Confirm } from "cliffy:prompt";

export const getDenoConfig = async () => {
  const MainConfigPath = join(Deno.cwd(), "deno.json");

  return (
    await import(`file:///${MainConfigPath}`, {
      with: { type: "json" },
    })
  ).default;
};

export const mergeConfig = async (dir: string) => {
  const TempConfigPath = join(dir, "deno.json");

  const TempConfig = (
    await import(`file:///${TempConfigPath}`, {
      with: { type: "json" },
    })
  ).default;

  const MainConfig = await getDenoConfig();

  const ResultConfig = deepMerge(MainConfig, TempConfig);

  delete ResultConfig.id;
  delete ResultConfig.version;
  delete ResultConfig.title;
  delete ResultConfig.description;
  delete ResultConfig.homepage;
  delete ResultConfig.icon;
  delete ResultConfig.author;
  delete ResultConfig.keywords;
  delete ResultConfig.donate;

  await Deno.writeTextFile(
    join(Deno.cwd(), "deno.json"),
    JSON.stringify(
      {
        ...MainConfig,
        ...ResultConfig,
      },
      undefined,
      2,
    ),
  );
};

export const mergeImports = async (dir: string) => {
  const TempImportsPath = join(dir, "import_map.json");
  const MainImportsPath = join(Deno.cwd(), "import_map.json");

  const TempImports = (
    await import(`file:///${TempImportsPath}`, {
      with: { type: "json" },
    })
  ).default;

  const MainImports = (
    await import(`file:///${MainImportsPath}`, {
      with: { type: "json" },
    })
  ).default;

  await Deno.writeTextFile(
    MainImportsPath,
    JSON.stringify(deepMerge(MainImports, TempImports), undefined, 2),
  );
};

export const updateCore = async (options: {
  template?: string;
  prompt?: boolean;
}) => {
  try {
    const Options = await e
      .object(
        {
          template: e
            .optional(e.string())
            .default(async () => (await getDenoConfig()).template ?? "master"),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);
    if (
      options.prompt &&
      !(await Confirm.prompt({
        message:
          `Updating the core will overwrite any changes made to the core and template files! Are you sure you want to continue?`,
      }))
    ) {
      return;
    }

    const GitRepoUrl = new URL("Oridune/epic-api", "https://github.com");
    const TempPath = join(Deno.cwd(), "_temp");

    await Deno.remove(TempPath, { recursive: true }).catch(() => {
      // Do nothing...
    });

    // deno-lint-ignore no-deprecated-deno-api
    const Process = Deno.run({
      cmd: [
        "git",
        "clone",
        "--single-branch",
        "--branch",
        Options.template,
        GitRepoUrl.toString(),
        TempPath,
      ],
    });

    const Status = await Process.status();

    if (Status.success) {
      Process.close();

      // Set of files that should not be updated because the are created just now...
      const CreatedFiles = new Set<string>();

      // Create Files
      for (
        const Glob of ["**/**/*"].map((pattern) =>
          expandGlob(pattern, {
            root: TempPath,
            globstar: true,
          })
        )
      ) {
        for await (const Entry of Glob) {
          if (!Entry.isDirectory) {
            const SourcePath = Entry.path;
            const TargetPath = Entry.path.replace(TempPath, Deno.cwd());
            const TargetDirectory = dirname(TargetPath);

            if (existsSync(TargetPath)) continue;

            await Deno.mkdir(TargetDirectory, { recursive: true }).catch(() => {
              // Do nothing...
            });

            await Deno.copyFile(SourcePath, TargetPath);

            CreatedFiles.add(TargetPath);
          }
        }
      }

      // Create/Update Files
      for (
        const Glob of [
          ".vscode/epic.code-snippets",
          "core/**/*",
          "docs/**/*",
          "templates/**/*",
          "tests/**/*",
          "serve.ts",
          "base.d.ts",
        ].map((pattern) =>
          expandGlob(pattern, {
            root: TempPath,
            globstar: true,
          })
        )
      ) {
        for await (const Entry of Glob) {
          if (!Entry.isDirectory) {
            const SourcePath = Entry.path;
            const TargetPath = Entry.path.replace(TempPath, Deno.cwd());
            const TargetDirectory = dirname(TargetPath);

            // If file is not already created just now than create/update...
            if (!CreatedFiles.has(TargetPath)) {
              await Deno.mkdir(TargetDirectory, { recursive: true }).catch(
                () => {
                  // Do nothing...
                },
              );

              await Deno.copyFile(SourcePath, TargetPath);
            }
          }
        }
      }

      // Update Docs File
      await Deno.copyFile(
        join(TempPath, "README.md"),
        join(Deno.cwd(), "new.README.md"),
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
  const { template, t } = parse(Deno.args);

  await updateCore({
    template: template ?? t,
    prompt: true,
  });

  Deno.exit();
}

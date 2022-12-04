// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { exists } from "fs";

export class Manager {
  static readonly LoadableExtensions = ["ts", "js"];

  static async getSequence(path: string): Promise<Set<string>> {
    const TargetDir = join(Deno.cwd(), path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    if (await exists(SequencePath)) {
      const Sequence = await import(`file:///${SequencePath}`, {
        assert: { type: "json" },
      });

      if (Sequence.default instanceof Array) return new Set(Sequence.default);
    }

    return new Set();
  }

  static async setSequence(
    path: string,
    sequence: Set<string> | ((sequence: Set<string>) => Set<string>)
  ) {
    const TargetDir = join(Deno.cwd(), path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    const Sequence =
      typeof sequence === "function"
        ? sequence(await Manager.getSequence(path))
        : sequence instanceof Array
        ? sequence
        : [];

    await Deno.writeFile(
      SequencePath,
      new TextEncoder().encode(JSON.stringify(Array.from(new Set(Sequence))))
    );
  }

  static async getList(path: string): Promise<string[]> {
    const TargetDir = join(Deno.cwd(), path);
    const Items: string[] = [];

    if (await exists(TargetDir))
      for await (const Entry of Deno.readDir(TargetDir))
        if (!Entry.isDirectory) Items.push(Entry.name);

    return Items;
  }

  static async load(path: string, parent?: string) {
    const Sequence = await Manager.getSequence(path);

    return (
      await Promise.all(
        Array.from(Sequence)
          .filter((name: string) => {
            const Parent = parent?.split(".");
            Parent?.pop();

            const Pattern = `(-?[a-zA-Z0-9]+)+\\.(${Manager.LoadableExtensions.join(
              "|"
            )})$`;

            return (
              Parent
                ? new RegExp(`^${Parent.join("\\.")}\\.${Pattern}`)
                : new RegExp(`^${Pattern}`)
            ).test(name);
          })
          .map(async (name: string) => {
            const FilePath = join(join(Deno.cwd(), path), name);

            if (await exists(FilePath))
              return (await import(`file:///${FilePath}`)).default;
          })
      )
    ).filter(Boolean) as any[];
  }
}

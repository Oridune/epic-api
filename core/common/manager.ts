// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { exists } from "fs";

export class Manager {
  protected LoadableExtensions = ["ts", "js"];

  constructor(public CWD = Deno.cwd()) {}

  public async getSequence(path: string): Promise<Set<string>> {
    const TargetDir = join(this.CWD, path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    if (await exists(SequencePath)) {
      const Sequence = JSON.parse(await Deno.readTextFile(SequencePath));
      if (Sequence instanceof Array) return new Set(Sequence);
    }

    return new Set();
  }

  public async setSequence(
    path: string,
    sequence: Set<string> | ((sequence: Set<string>) => Set<string>)
  ) {
    const TargetDir = join(this.CWD, path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    const Sequence =
      typeof sequence === "function"
        ? sequence(await this.getSequence(path))
        : sequence instanceof Array
        ? sequence
        : [];

    await Deno.writeTextFile(
      SequencePath,
      JSON.stringify(Array.from(new Set(Sequence)))
    );
  }

  public async getFilesList(path: string): Promise<string[]> {
    const TargetDir = join(this.CWD, path);
    const Items: string[] = [];

    if (await exists(TargetDir))
      for await (const Entry of Deno.readDir(TargetDir))
        if (!Entry.isDirectory) Items.push(Entry.name);

    return Items;
  }

  public async getFoldersList(path: string): Promise<string[]> {
    const TargetDir = join(this.CWD, path);
    const Items: string[] = [];

    if (await exists(TargetDir))
      for await (const Entry of Deno.readDir(TargetDir))
        if (Entry.isDirectory) Items.push(Entry.name);

    return Items;
  }

  public async getModules(path: string, parent?: string) {
    const Sequence = await this.getSequence(path);

    return (
      await Promise.all(
        Array.from(Sequence)
          .filter((name: string) => {
            const Parent = parent?.split(".");
            Parent?.pop();

            const Pattern = `(-?[a-zA-Z0-9]+)+\\.(${this.LoadableExtensions.join(
              "|"
            )})$`;

            return (
              Parent
                ? new RegExp(`^${Parent.join("\\.")}\\.${Pattern}`)
                : new RegExp(`^${Pattern}`)
            ).test(name);
          })
          .map(async (name: string) => {
            const FilePath = join(join(this.CWD, path), name);

            if (await exists(FilePath))
              return (await import(`file:///${FilePath}`)).default;
          })
      )
    ).filter(Boolean) as any[];
  }

  public async getPlugins() {
    return Array.from(await this.getSequence("plugins")).map(
      (path) => new Manager(join(this.CWD, "plugins", path))
    );
  }
}

export default new Manager(Deno.cwd());

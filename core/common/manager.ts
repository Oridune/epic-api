// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { exists } from "fs";

export interface ISequenceData {
  sequence?: string[];
  excludes?: string[];
}

export class Manager {
  protected LoadableExtensions = ["ts", "js"];

  constructor(public CWD = Deno.cwd()) {}

  public async getSequenceData(path: string): Promise<ISequenceData> {
    const TargetDir = join(this.CWD, path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    if (await exists(SequencePath)) {
      try {
        const Sequence = JSON.parse(await Deno.readTextFile(SequencePath));
        if (Sequence instanceof Array) return { sequence: Sequence };
        if (typeof Sequence === "object" && Sequence !== null) return Sequence;
      } catch {
        // Do nothing...
      }
    }

    return {};
  }

  public async setSequenceData(
    path: string,
    data:
      | ISequenceData
      | ((data: ISequenceData) => ISequenceData | Promise<ISequenceData>)
  ) {
    const TargetDir = join(this.CWD, path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    const Data =
      typeof data === "function"
        ? await data(await this.getSequenceData(path))
        : typeof data === "object" && data !== null
        ? data
        : {};

    await Deno.writeTextFile(SequencePath, JSON.stringify(Data, undefined, 2));
  }

  public async getSequence(
    path: string,
    options?: { strict?: boolean }
  ): Promise<Set<string>> {
    const Data = await this.getSequenceData(path);
    const Sequence = options?.strict
      ? Data.sequence?.filter((name) => !Data.excludes?.includes(name))
      : Data.sequence;

    return new Set(Sequence);
  }

  public async setSequence(
    path: string,
    sequence:
      | Set<string>
      | ((sequence: Set<string>) => Set<string> | Promise<Set<string>>)
  ) {
    await this.setSequenceData(path, async (data) => {
      data.sequence =
        typeof sequence === "function"
          ? Array.from(await sequence(new Set<string>(data.sequence)))
          : sequence instanceof Set
          ? Array.from(sequence)
          : [];

      return data;
    });
  }

  public async getModules(path: string, parent?: string) {
    const Sequence = await this.getSequence(path, { strict: true });

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
    return Array.from(await this.getSequence("plugins", { strict: true })).map(
      (path) => new Manager(join(this.CWD, "plugins", path))
    );
  }
}

export default new Manager(Deno.cwd());

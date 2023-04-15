// deno-lint-ignore-file no-explicit-any
import { join } from "path";
import { exists } from "fs";
import { basename, dirname } from "path";

export interface ISequenceData {
  sequence?: string[];
  excludes?: string[];
}

export interface ISequenceDetail {
  name: string;
  enabled: boolean;
}

export class Manager {
  protected Ready = false;
  protected SupportedModuleExtensions = ["ts", "js"];

  public id!: string;
  public version!: string;
  public name!: string;
  public description!: string;
  public homepage?: string;
  public icon?: string;
  public author?: {
    name?: string;
    email?: string;
    url?: string;
  };
  public keywords!: string[];
  public donate?: string;
  public enabled?: boolean;

  constructor(public CWD = Deno.cwd()) {}

  /**
   * Initialize the Manager (Required)
   * @returns
   */
  public async init() {
    const Config = (
      await import(`file:///${join(this.CWD, "deno.json")}`, {
        assert: { type: "json" },
      })
    ).default;

    this.id = Config.id ?? "unknown";
    this.version = Config.version ?? "0.0.1";
    this.name = Config.name ?? "Unknown";
    this.description =
      Config.description ??
      "No description for this instance has been provided!";
    this.homepage = Config.homepage;
    this.icon = Config.icon;
    this.author = typeof Config.author === "object" ? Config.author : {};
    this.keywords = Config.keywords instanceof Array ? Config.keywords : [];
    this.donate = Config.donate;

    this.Ready = true;
    return this;
  }

  /**
   * Read the raw sequence data from .sequence.json file
   * @param path Path to the folder containing the sequence file.
   * @param options
   * @returns
   */
  public async getSequenceData(
    path: string,
    options?: {
      cwd?: string;
      fullPath?: string;
    }
  ): Promise<ISequenceData> {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    const TargetDir = options?.fullPath ?? join(options?.cwd ?? this.CWD, path);
    const SequencePath = join(TargetDir, "./.sequence.json");

    if (await exists(SequencePath)) {
      try {
        const Sequence = JSON.parse(await Deno.readTextFile(SequencePath));
        if (Sequence instanceof Array) return { sequence: Sequence };
        if (typeof Sequence === "object" && Sequence !== null) {
          if (Sequence.excludes instanceof Array && Sequence.excludes.length) {
            Sequence.excludes =
              Sequence.sequence instanceof Array
                ? Sequence.excludes.filter((name: string) =>
                    Sequence.sequence.includes(name)
                  )
                : undefined;
          }

          return Sequence;
        }
      } catch (error) {
        console.error(error);
      }
    }

    return {};
  }

  /**
   * Write/Overwrite a raw sequence file.
   * @param path Path to the folder containing the sequence file.
   * @param data Raw sequence data.
   */
  public async setSequenceData(
    path: string,
    data:
      | ISequenceData
      | ((data: ISequenceData) => ISequenceData | Promise<ISequenceData>)
  ) {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

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

  /**
   * Reads the sequence information from .sequence.json > sequence
   * @param path Path to the folder containing the sequence file.
   * @param options
   * @returns
   */
  public async getSequence(
    path: string,
    options?: {
      strict?: boolean;
      cwd?: string;
      fullPath?: string;
    }
  ): Promise<Set<string>> {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    const Data = await this.getSequenceData(path, {
      cwd: options?.cwd,
      fullPath: options?.fullPath,
    });
    const Sequence = options?.strict
      ? Data.sequence?.filter((name) => !Data.excludes?.includes(name))
      : Data.sequence;

    return new Set(Sequence);
  }

  /**
   * Reads the excludes information from .sequence.json > excludes
   * @param path Path to the folder containing the sequence file.
   * @returns
   */
  public async getExcludes(path: string): Promise<Set<string>> {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    const Data = await this.getSequenceData(path);
    const Excludes = Data.excludes;

    return new Set(Excludes);
  }

  /**
   * Reads the sequence information in detail from .sequence.json > sequence
   * @param path Path to the folder containing the sequence file.
   * @returns
   */
  public async getDetailedSequence(
    path: string
  ): Promise<Array<ISequenceDetail>> {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    const Data = await this.getSequenceData(path);
    const Sequence = new Set(Data.sequence);

    return Array.from(Sequence).map((name) => ({
      name,
      enabled: !Data.excludes?.includes(name),
    }));
  }

  /**
   * Write/Overwrite .sequence.json > sequence
   * @param path Path to the folder containing the sequence file.
   * @param sequence A Set of sequence data or a Callback that returns the Set of sequence data.
   */
  public async setSequence(
    path: string,
    sequence:
      | Set<string>
      | ((sequence: Set<string>) => Set<string> | Promise<Set<string>>)
  ) {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

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

  /**
   * Write/Overwrite .sequence.json > excludes
   * @param path Path to the folder containing the sequence file.
   * @param excludes A Set of excludes data or a Callback that returns the Set of excludes data.
   */
  public async setExcludes(
    path: string,
    excludes:
      | Set<string>
      | ((excludes: Set<string>) => Set<string> | Promise<Set<string>>)
  ) {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    await this.setSequenceData(path, async (data) => {
      data.excludes = (
        typeof excludes === "function"
          ? Array.from(await excludes(new Set<string>(data.excludes)))
          : excludes instanceof Set
          ? Array.from(excludes)
          : []
      ).filter((name) => data.sequence?.includes(name));

      return data;
    });
  }

  /**
   * Gets all the default exported modules from a specified path
   * @param path Path to the folder containing the modules.
   * @param parent Name of a parent module.
   * @returns
   */
  public async getModules(path: string, currentModuleUrl?: string) {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    const Sequence = await this.getSequence(path, {
      strict: true,
      fullPath: currentModuleUrl
        ? dirname(currentModuleUrl.replace("file:///", ""))
        : undefined,
    });

    const Parent = (currentModuleUrl ? basename(currentModuleUrl) : undefined)
      ?.split(".")
      ?.slice(0, -1)
      ?.join("\\.");

    return (
      await Promise.all(
        Array.from(Sequence)
          .filter((name: string) => {
            const Pattern = `(-?[a-zA-Z0-9]+)+\\.(${this.SupportedModuleExtensions.join(
              "|"
            )})$`;

            return (
              Parent
                ? new RegExp(`^${Parent}\\.${Pattern}`)
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

  /**
   * Get a list of Active plugins
   * @returns
   */
  public async getActivePlugins() {
    return (await this.getPlugins()).filter((manager) => manager.enabled);
  }

  /**
   * Get a list of all plugins
   * @returns
   */
  public async getPlugins() {
    if (!this.Ready)
      throw new Error(`Manager instance has not been initialized yet!`);

    return Promise.all(
      Array.from(await this.getDetailedSequence("plugins")).map(
        async (detail) => {
          const ManagerInstance = await new Manager(
            join(this.CWD, "plugins", detail.name)
          ).init();

          ManagerInstance.id = detail.name;
          ManagerInstance.enabled = detail.enabled;

          return ManagerInstance;
        }
      )
    );
  }

  /**
   * Converts the Class to a Normalized Object
   * @returns
   */
  public toJSON() {
    // deno-lint-ignore no-unused-vars
    const { CWD, Ready, SupportedModuleExtensions, ...object } = { ...this };
    return object;
  }
}

export default await new Manager(Deno.cwd()).init();

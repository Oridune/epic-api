// deno-lint-ignore-file no-explicit-any
import { join, dirname } from "path";

export interface ISequence {
  sequence?: string[];
  excludes?: string[];
}

export class Sequence {
  protected Type: string;
  protected Path: string;
  protected Includes: Set<string>;
  protected Excludes: Set<string>;

  protected async persist() {
    await Deno.writeTextFile(this.Path, JSON.stringify(this.toJSON(), null, 2));
  }

  constructor(type: string, path: string, data: ISequence) {
    this.Type = type;
    this.Path = path;
    this.Includes = new Set(
      data.sequence instanceof Array
        ? data.sequence.filter((_) => typeof _ === "string")
        : []
    );
    this.Excludes = new Set(
      data.excludes instanceof Array
        ? data.excludes.filter((_) => typeof _ === "string")
        : []
    );
  }

  /**
   * Get the included items in the sequence
   * @returns
   */
  public includes() {
    return this.Includes;
  }

  /**
   * Get items that are excluded (disabled)
   * @returns
   */
  public excludes() {
    return this.Excludes;
  }

  /**
   * Lists the active sequence items
   * @returns
   */
  public list() {
    const List: string[] = [];

    for (const Item of this.Includes)
      if (!this.Excludes.has(Item)) List.push(Item);

    return List;
  }

  /**
   * Lists all sequence items in detail
   * @returns
   */
  public listDetailed() {
    return Array.from(this.Includes).map((name) => ({
      name,
      path: join(dirname(this.Path), name),
      enabled: !this.Excludes.has(name),
    }));
  }

  /**
   * Add or Remove sequence items
   * @param sequence A `Set` or a `function` that returns a `Set`
   */
  public async set(
    sequence:
      | Set<string>
      | ((sequence: Set<string>) => Set<string> | Promise<Set<string>>)
  ) {
    this.Includes =
      typeof sequence === "function"
        ? await sequence(this.Includes)
        : sequence instanceof Set
        ? sequence
        : this.Includes;

    await this.persist();
  }

  /**
   * Add or Remove excluded sequence items
   * @param sequence A `Set` or a `function` that returns a `Set`
   */
  public async exclude(
    excludes:
      | Set<string>
      | ((excludes: Set<string>) => Set<string> | Promise<Set<string>>)
  ) {
    this.Excludes =
      typeof excludes === "function"
        ? await excludes(this.Excludes)
        : excludes instanceof Set
        ? excludes
        : this.Excludes;

    await this.persist();
  }

  /**
   * Remove sequence items
   * @param items Items to be removed
   */
  public async delete(...items: string[]) {
    (items instanceof Array ? items : []).forEach(this.Includes.delete);

    await this.persist();
  }

  /**
   * Enable or Disable sequence items
   * @param items
   */
  public async toggle(...items: string[]) {
    (items instanceof Array ? items : []).forEach((item) => {
      if (this.Includes.has(item))
        if (this.Excludes.has(item)) this.Excludes.delete(item);
        else this.Excludes.add(item);
    });

    await this.persist();
  }

  /**
   * Converts the Class to a Normalized Object
   * @returns
   */
  public toJSON() {
    // Resolve Sequence Data
    Array.from(this.Excludes).forEach((item) => {
      if (!this.Includes.has(item)) this.Excludes.delete(item);
    });

    return {
      sequence: Array.from(this.Includes),
      excludes: Array.from(this.Excludes),
    };
  }
}

export type TModuleTree = Map<
  string,
  {
    sequence: Sequence;
    modules: Map<
      string,
      {
        name: string;
        object: any;
      }
    >;
    loaders: Map<
      string,
      {
        name: string;
        tree: TModuleTree;
      }
    >;
  }
>;

export type TLoadOptions = {
  cwd?: string;
  includeTypes?: string[];
  excludeTypes?: string[];
  sequenceOnly?: boolean;
};

export class Loader {
  protected static Tree: TModuleTree = new Map();

  protected static SequenceFileName = ".sequence.json";
  protected static Modules = [
    "controllers",
    "models",
    "middlewares",
    "hooks",
    "jobs",
    "templates",
  ];
  protected static Loaders = ["plugins"];
  protected static Sequence = ["public"];

  protected static readLocalModule(path: string, options?: any) {
    return import(`file://${path}`, options);
  }

  protected static getAllTypes() {
    return [...Loader.Modules, ...Loader.Loaders, ...Loader.Sequence];
  }

  protected static async buildTree(options?: TLoadOptions) {
    const CWD = options?.cwd ?? Deno.cwd();
    const Tree: TModuleTree = new Map();
    const Types = Loader.getAllTypes();

    await Promise.all(
      Types.filter(
        (_) =>
          (!(options?.includeTypes instanceof Array) ||
            options.includeTypes.includes(_)) &&
          (!(options?.excludeTypes instanceof Array) ||
            !options.excludeTypes.includes(_))
      ).map(async (type) => {
        try {
          const SequenceDataPath = join(CWD, type, Loader.SequenceFileName);
          const SequenceData = await Loader.readLocalModule(SequenceDataPath, {
            assert: { type: "json" },
          });

          const SequenceObject = new Sequence(
            type,
            SequenceDataPath,
            SequenceData.default
          );

          const Modules: Map<any, any> = new Map();

          if (!options?.sequenceOnly && Loader.Modules.includes(type))
            await Promise.all(
              SequenceObject.list().map(async (name) => {
                const ModulePath = join(dirname(SequenceDataPath), name);
                Modules.set(name, {
                  name,
                  object: await Loader.readLocalModule(ModulePath),
                });
              })
            );

          const Loaders: Map<any, any> = new Map();

          if (!options?.sequenceOnly && Loader.Loaders.includes(type))
            await Promise.all(
              SequenceObject.list().map(async (name) => {
                const PluginPath = join(dirname(SequenceDataPath), name);
                Loaders.set(name, {
                  name,
                  tree: await Loader.buildTree({
                    ...options,
                    cwd: PluginPath,
                  }),
                });
              })
            );

          Tree.set(type, {
            sequence: SequenceObject,
            modules: Modules,
            loaders: Loaders,
          });
        } catch (error) {
          console.error(error);
        }
      })
    );

    return Tree;
  }

  /**
   * Throws an error if target is not a valid type
   * @param target
   * @param type
   * @returns
   */
  static isValidType(
    target: string,
    category?: "module" | "loader" | "sequence"
  ) {
    const Err = new Error(`Invalid loader type '${target}'!`);
    switch (category) {
      case "module":
        if (!Loader.Modules.includes(target)) throw Err;
        break;
      case "loader":
        if (!Loader.Loaders.includes(target)) throw Err;
        break;
      case "sequence":
        if (!Loader.Sequence.includes(target)) throw Err;
        break;

      default:
        if (!Loader.getAllTypes().includes(target)) throw Err;
        break;
    }

    return target;
  }

  /**
   * Builds a module tree of your project
   * @param options
   */
  static async load(options?: TLoadOptions) {
    Loader.Tree = await Loader.buildTree(options);
  }

  /**
   * Get the `Sequence` object for a given type
   * @param type
   * @returns
   */
  static getSequence(type: string) {
    return Loader.Tree.get(Loader.isValidType(type))?.sequence;
  }

  /**
   * Get the module for a given type
   * @param type
   * @returns
   */
  static getModules(type: string) {
    return Loader.Tree.get(Loader.isValidType(type, "module"))?.modules;
  }

  /**
   * Get the sub-loaders for e.g. `plugins`
   * @param type
   * @returns
   */
  static getLoaders(type = "plugins") {
    return Loader.Tree.get(Loader.isValidType(type, "loader"))?.loaders;
  }
}

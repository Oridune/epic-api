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

  public includes() {
    return this.Includes;
  }

  public excludes() {
    return this.Excludes;
  }

  public list() {
    const List: string[] = [];

    for (const Item of this.Includes)
      if (!this.Excludes.has(Item)) List.push(Item);

    return List;
  }

  public listDetailed() {
    return this.list().map((name) => ({
      name,
      path: join(dirname(this.Path), name),
    }));
  }

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

  public async delete(...items: string[]) {
    (items instanceof Array ? items : []).forEach((item) => {
      this.Includes.delete(item);
      this.Excludes.delete(item);
    });

    await this.persist();
  }

  /**
   * Converts the Class to a Normalized Object
   * @returns
   */
  public toJSON() {
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
                    cwd: PluginPath,
                    includeTypes: options?.includeTypes,
                  }),
                });
              })
            );

          Tree.set(type, {
            sequence: SequenceObject,
            modules: Modules,
            loaders: Loaders,
          });
        } catch {
          // Do nothing...
        }
      })
    );

    return Tree;
  }

  static isValidType(target: string, type?: "module" | "loader" | "sequence") {
    const Err = new Error(`Invalid loader type '${target}'!`);
    switch (type) {
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

  static async load(options?: TLoadOptions) {
    Loader.Tree = await Loader.buildTree(options);
  }

  static getSequence(type: string) {
    return Loader.Tree.get(Loader.isValidType(type))?.sequence;
  }

  static getModules(type: string) {
    return Loader.Tree.get(Loader.isValidType(type, "module"))?.modules;
  }

  static getLoaders(type = "plugins") {
    return Loader.Tree.get(Loader.isValidType(type, "loader"))?.loaders;
  }
}

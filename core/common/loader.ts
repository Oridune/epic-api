// deno-lint-ignore-file no-explicit-any
import { dirname, join } from "path";
import { EnvType } from "@Core/common/env.ts";
import { Env } from "@Core/common/mod.ts";

export type TSequenceProps = Record<string, Record<string, string>>;

export interface ISequence {
  sequence?: string[];
  "sequence.development"?: string[];
  "sequence.test"?: string[];
  "sequence.production"?: string[];
  excludes?: string[];
  sequenceProps?: TSequenceProps;
}

export interface ISequenceDetail {
  name: string;
  path: string;
  enabled: boolean;
  props: TSequenceProps[string];
}

export type SupportedEnv = EnvType | "global";

export interface IEnvOptions {
  env?: SupportedEnv;
}

export class Sequence {
  protected Type: string;
  protected Path: string;

  protected Sequence: Set<string>;
  protected SequenceDevelopment: Set<string>;
  protected SequenceTest: Set<string>;
  protected SequenceProduction: Set<string>;

  protected Includes: Set<string>;
  protected Excludes: Set<string>;

  protected SequenceProps: TSequenceProps;

  protected async persist() {
    await Deno.writeTextFile(this.Path, JSON.stringify(this.toJSON(), null, 2));
  }

  protected pickObjectProperties<T extends object>(
    obj: T,
    props: Set<string> | Set<string>[],
  ) {
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) =>
        (props instanceof Array ? props : [props]).reduce(
          (allow, props) => allow || props.has(key),
          false,
        )
      ),
    );
  }

  public buildIncludes() {
    return this.Includes = new Set(
      [
        ...this.Sequence,
        ...(Env.is(EnvType.DEVELOPMENT)
          ? this.SequenceDevelopment
          : Env.is(EnvType.TEST)
          ? this.SequenceTest
          : Env.is(EnvType.PRODUCTION)
          ? this.SequenceProduction
          : []),
      ],
    );
  }

  constructor(type: string, path: string, data: ISequence | string[]) {
    this.Type = type;
    this.Path = path;

    this.Sequence = new Set(
      data instanceof Array
        ? data
        : data.sequence instanceof Array
        ? data.sequence.filter((_) => typeof _ === "string")
        : [],
    );

    this.SequenceDevelopment = new Set(
      data instanceof Array
        ? data
        : data["sequence.development"] instanceof Array
        ? data["sequence.development"].filter((_) => typeof _ === "string")
        : [],
    );

    this.SequenceTest = new Set(
      data instanceof Array
        ? data
        : data["sequence.test"] instanceof Array
        ? data["sequence.test"].filter((_) => typeof _ === "string")
        : [],
    );

    this.SequenceProduction = new Set(
      data instanceof Array
        ? data
        : data["sequence.production"] instanceof Array
        ? data["sequence.production"].filter((_) => typeof _ === "string")
        : [],
    );

    this.Excludes = new Set(
      !(data instanceof Array) && data.excludes instanceof Array
        ? data.excludes.filter((_) => typeof _ === "string")
        : [],
    );

    this.Includes = this.buildIncludes();

    this.SequenceProps =
      !(data instanceof Array) && typeof data.sequenceProps === "object"
        ? this.pickObjectProperties(data.sequenceProps, this.Includes)
        : {};
  }

  /**
   * Get the included items in the sequence (development)
   * @returns
   */
  public includesDevelopment() {
    return this.SequenceDevelopment;
  }

  /**
   * Get the included items in the sequence (test)
   * @returns
   */
  public includesTest() {
    return this.SequenceTest;
  }

  /**
   * Get the included items in the sequence (production)
   * @returns
   */
  public includesProduction() {
    return this.SequenceProduction;
  }

  /**
   * Get the included items in the sequence (global)
   * @returns
   */
  public includesGlobal() {
    return this.Sequence;
  }

  /**
   * Get the included items in the sequence
   * @returns
   */
  public includes(options?: IEnvOptions) {
    switch (options?.env) {
      case EnvType.DEVELOPMENT:
        return this.includesDevelopment();

      case EnvType.TEST:
        return this.includesTest();

      case EnvType.PRODUCTION:
        return this.includesProduction();

      case "global":
        return this.includesGlobal();

      default:
        return this.Includes;
    }
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
  public list(options?: IEnvOptions) {
    const List: string[] = [];

    for (const Item of this.includes(options)) {
      if (!this.Excludes.has(Item)) List.push(Item);
    }

    return List;
  }

  public getDetailed(
    name: string,
    options?: IEnvOptions,
  ): ISequenceDetail | null {
    if (!this.includes(options).has(name)) return null;

    return {
      name,
      path: join(dirname(this.Path), name),
      enabled: !this.Excludes.has(name),
      props: this.SequenceProps[name],
    };
  }

  /**
   * Lists all sequence items in detail
   * @returns
   */
  public listDetailed(options?: { enabled?: boolean } & IEnvOptions) {
    const DetailsMap = new Map<string, ISequenceDetail>();

    for (const Name of this.includes(options)) {
      const Detail = this.getDetailed(Name, options);

      if (
        Detail &&
        (typeof options?.enabled !== "boolean" ||
          Detail.enabled === options.enabled)
      ) DetailsMap.set(Name, Detail);
    }

    return DetailsMap;
  }

  /**
   * Add or Remove sequence items
   * @param sequence A `Set` or a `function` that returns a `Set`
   */
  public async set(
    sequence:
      | Set<string>
      | ((sequence: Set<string>) => Set<string> | Promise<Set<string>>),
    options?: { noPersist?: boolean } & IEnvOptions,
  ) {
    switch (options?.env) {
      case EnvType.DEVELOPMENT:
        this.SequenceDevelopment = typeof sequence === "function"
          ? await sequence(this.SequenceDevelopment)
          : sequence instanceof Set
          ? sequence
          : this.SequenceDevelopment;
        break;

      case EnvType.TEST:
        this.SequenceTest = typeof sequence === "function"
          ? await sequence(this.SequenceTest)
          : sequence instanceof Set
          ? sequence
          : this.SequenceTest;
        break;

      case EnvType.PRODUCTION:
        this.SequenceProduction = typeof sequence === "function"
          ? await sequence(this.SequenceProduction)
          : sequence instanceof Set
          ? sequence
          : this.SequenceProduction;
        break;

      default:
        this.Sequence = typeof sequence === "function"
          ? await sequence(this.Sequence)
          : sequence instanceof Set
          ? sequence
          : this.Sequence;
        break;
    }

    this.buildIncludes();

    if (!options?.noPersist) await this.persist();
  }

  public async add(
    name: string,
    props?: Record<string, string>,
    options?: IEnvOptions,
  ) {
    if (typeof props === "object") this.SequenceProps[name] = props;

    await this.set((_) => _.add(name), options);
  }

  /**
   * Remove sequence items
   * @param items Items to be removed
   */
  public async delete(items: string[], options?: IEnvOptions) {
    this.set((_) => {
      (items instanceof Array ? items : []).forEach(_.delete);
      return _;
    }, { ...options, noPersist: true });

    await this.persist();
  }

  /**
   * Add or Remove excluded sequence items
   * @param sequence A `Set` or a `function` that returns a `Set`
   */
  public async exclude(
    excludes:
      | Set<string>
      | ((excludes: Set<string>) => Set<string> | Promise<Set<string>>),
  ) {
    this.Excludes = typeof excludes === "function"
      ? await excludes(this.Excludes)
      : excludes instanceof Set
      ? excludes
      : this.Excludes;

    await this.persist();
  }

  /**
   * Enable or disable sequence items
   * @param id Id of the module
   */
  public async toggle(
    id: string,
  ) {
    if (this.Includes.has(id)) {
      if (this.Excludes.has(id)) this.Excludes.delete(id);
      else this.Excludes.add(id);
    }

    await this.persist();
  }

  /**
   * Converts the Class to a Normalized Object
   * @returns
   */
  public toJSON() {
    // // Resolve Sequence Data
    // Array.from(this.Excludes).forEach((item) => {
    //   if (!this.Includes.has(item)) this.Excludes.delete(item);
    // });

    return {
      sequence: Array.from(this.Sequence),
      ["sequence.development"]: Array.from(this.SequenceDevelopment),
      ["sequence.test"]: Array.from(this.SequenceTest),
      ["sequence.production"]: Array.from(this.SequenceProduction),

      excludes: Array.from(this.Excludes),

      sequenceProps: this.pickObjectProperties(
        this.SequenceProps,
        this.Includes,
      ),
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
        import: () => Promise<any>;
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
  protected static Statics = ["public", "locales"];

  protected static readLocalModule(path: string, options?: any) {
    return import(`file://${path}`, options);
  }

  protected static getAllTypes() {
    return [...Loader.Modules, ...Loader.Loaders, ...Loader.Statics];
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
            !options.excludeTypes.includes(_)),
      ).map(async (type) => {
        try {
          const SequenceDataPath = join(CWD, type, Loader.SequenceFileName);
          const SequenceData = await Loader.readLocalModule(SequenceDataPath, {
            with: { type: "json" },
          });

          const SequenceObject = new Sequence(
            type,
            SequenceDataPath,
            SequenceData.default,
          );

          const Modules: Map<any, any> = new Map();

          if (!options?.sequenceOnly && Loader.Modules.includes(type)) {
            SequenceObject.list().map((name) => {
              const ModulePath = join(dirname(SequenceDataPath), name);
              Modules.set(name, {
                name,
                import: () => Loader.readLocalModule(ModulePath),
              });
            });
          }

          const Loaders: Map<any, any> = new Map();

          if (!options?.sequenceOnly && Loader.Loaders.includes(type)) {
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
              }),
            );
          }

          Tree.set(type, {
            sequence: SequenceObject,
            modules: Modules,
            loaders: Loaders,
          });
        } catch (error) {
          console.error(error);
        }
      }),
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
    category?: "module" | "loader" | "static",
  ) {
    const Err = new Error(`Invalid loader type '${target}'!`);

    switch (category) {
      case "module":
        if (!Loader.Modules.includes(target)) throw Err;
        break;
      case "loader":
        if (!Loader.Loaders.includes(target)) throw Err;
        break;
      case "static":
        if (!Loader.Statics.includes(target)) throw Err;
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

  static async loadModules(type: string) {
    const modules = Loader.getModules(type);

    if (!modules) return [];

    return Object.assign(
      {},
      ...(await Promise.all(
        Array.from(modules).map(async (
          [_, { name, import: importModule }],
        ) => ({
          [name]: await importModule(),
        })),
      )),
    );
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

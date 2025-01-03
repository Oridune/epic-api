import { parse } from "dotenv";
import { join } from "path";

export enum EnvType {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}

export class Env {
  static configuration?: Record<string, string>;
  static onGetFailed?: (
    key: string,
  ) => Promise<string | null | undefined> | string | null | undefined;

  /**
   * Get the type of current environment (development, production, test etc.)
   */
  static getType() {
    const Target = Deno.env.get("ENV_TYPE") as EnvType | undefined;

    return Target && Object.values(EnvType).includes(Target)
      ? Target
      : EnvType.DEVELOPMENT;
  }

  /**
   * Check environment.
   * @param type Type of environment (development, production, test etc.)
   * @returns
   */
  static is(...types: EnvType[]) {
    return types.includes(Env.getType());
  }

  /**
   * Get all environment variables
   * @returns
   */
  static getAll() {
    let GlobalEnv: Record<string, string>;

    try {
      GlobalEnv = parse(Deno.readTextFileSync(join(Deno.cwd(), `./env/.env`)));
    } catch {
      GlobalEnv = {};
    }

    let ScopedEnv: Record<string, string>;

    try {
      ScopedEnv = parse(
        Deno.readTextFileSync(join(Deno.cwd(), `./env/.${Env.getType()}.env`)),
      );
    } catch {
      ScopedEnv = {};
    }

    return (Env.configuration ?? (Env.configuration = {
      ...Deno.env.toObject(),
      ...GlobalEnv,
      ...ScopedEnv,
    }));
  }

  /**
   * Asynchronously get a specific environment variable
   *
   * It is recomended to use get method instead of getSync because it makes a backup call (to a database or some other configured source) to ensure the availability of the environment variable.
   *
   * You can assign a custom backup method on Env.onGetFailed if it is not already assigned.
   * @param key Key of the variable
   * @returns
   */
  static async get(key: string): Promise<string>;

  /**
   * Asynchronously get a specific environment variable
   *
   * It is recomended to use get method instead of getSync because it makes a backup call (to a database or some other configured source) to ensure the availability of the environment variable.
   *
   * You can assign a custom backup method on Env.onGetFailed if it is not already assigned.
   * @param key Key of the variable
   * @param silent By passing `true` this function will not throw an error and instead it will return `undefined`.
   */
  static async get(key: string, silent: true): Promise<string | undefined>;
  static async get(key: string, silent?: true) {
    let Data: string | null | undefined = Env.getAll()[key];

    if (typeof Data !== "string") {
      if (typeof Env.onGetFailed === "function") {
        Data = await Env.onGetFailed(key);
      }

      if (typeof Data !== "string") {
        if (silent) return;
        else throw new Error(`Missing environment variable '${key}'!`);
      }
    }

    return Data;
  }

  /**
   * Asynchronously get a specific environment variable and cast to boolean
   * @param key Key of the variable
   * @returns
   */
  static async enabled(key: string): Promise<boolean> {
    return ["true", "1"].includes(await this.get(key, true) as string);
  }

  /**
   * Get a specific environment variable
   *
   * It is recomended to use get method instead of getSync because it makes a backup call (to a database or some other configured source) to ensure the availability of the environment variable.
   * @param key Key of the variable
   * @returns
   */
  static getSync(key: string): string;

  /**
   * Get a specific environment variable
   *
   * It is recomended to use get method instead of getSync because it makes a backup call (to a database or some other configured source) to ensure the availability of the environment variable.
   * @param key Key of the variable
   * @param silent By passing `true` this function will not throw an error and instead it will return `undefined`.
   * @returns
   */
  static getSync(key: string, silent: true): string | undefined;
  static getSync(key: string, silent?: true) {
    const Value: string | null | undefined = Env.getAll()[key];

    if (typeof Value !== "string") {
      if (silent) return;
      else throw new Error(`Missing environment variable '${key}'!`);
    }

    return Value;
  }

  static enabledSync(key: string): boolean {
    return ["true", "1"].includes(this.getSync(key, true) as string);
  }
}

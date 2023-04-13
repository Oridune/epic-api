import { config } from "config";
import { join } from "path";

export enum EnvType {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  STAGING = "staging",
  SANDBOX = "sandbox",
  TEST = "test",
}

export class Env {
  static configuration?: Record<string, string>;
  static onGetFailed?: (
    key: string
  ) => Promise<string | null | undefined> | string | null | undefined;

  /**
   * Get the type of current environment (development, production, test etc.)
   *
   */
  static getType() {
    const Target = Deno.env.get("ENV_TYPE");

    return Target && Object.values(EnvType).includes(Target as EnvType)
      ? Target
      : EnvType.DEVELOPMENT;
  }

  /**
   * Check environment.
   * @param type Type of environment (development, production, test etc.)
   * @returns
   */
  static is(type: EnvType) {
    return Env.getType() === type;
  }

  /**
   * Get all environment variables
   * @returns
   */
  static getAll() {
    return (
      Env.configuration ??
      (Env.configuration = config({
        path: join(Deno.cwd(), `./env/.${Env.getType()}.env`),
      }))
    );
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
  static async get(key: string) {
    let Data: string | null | undefined = Env.getAll()[key];

    if (typeof Data !== "string") {
      if (typeof Env.onGetFailed === "function")
        Data = await Env.onGetFailed(key);

      if (typeof Data !== "string")
        throw new Error(`Missing environment variable '${key}'!`);
    }

    return Data;
  }

  /**
   * Get a specific environment variable
   *
   * It is recomended to use get method instead of getSync because it makes a backup call (to a database or some other configured source) to ensure the availability of the environment variable.
   * @param key Key of the variable
   * @returns
   */
  static getSync(key: string) {
    const Data: string | null | undefined = Env.getAll()[key];

    if (typeof Data !== "string")
      throw new Error(`Missing environment variable '${key}'!`);

    return Data;
  }
}

import { config } from "config";
import { join } from "path";

export enum EnvType {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
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
   * Get a specific environment variable
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
}

import { config } from "config";
import { join } from "path";

export enum EnvType {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}

export class Env {
  static configuration?: Record<string, string>;

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
  static get(key: string) {
    const Target = Env.getAll()[key];

    if (Target === undefined)
      throw new Error(`Missing environment variable '${key}'!`);

    return Target;
  }
}

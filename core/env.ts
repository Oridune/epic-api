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
   * Type of the current environment (development, production, test)
   *
   */
  static getEnvType() {
    const Target = Deno.env.get("ENV_TYPE");

    return Target && Object.values(EnvType).includes(Target as EnvType)
      ? Target
      : EnvType.PRODUCTION;
  }

  static getConfiguration() {
    return (
      Env.configuration ??
      (Env.configuration = config({
        path: join(Deno.cwd(), `./env/.${Env.getEnvType()}.env`),
      }))
    );
  }

  static get(key: string) {
    const Target = Env.getConfiguration()[key];

    if (Target === undefined)
      throw new Error(`Missing environment variable '${key}'!`);

    return Target;
  }
}

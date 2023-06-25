import { type TRequestHandlerObject } from "./controller/base.ts";

export class Versioned {
  private Map = new Map<string | string[], TRequestHandlerObject>();

  /**
   * Add a request handler version
   * @param version Version of the API request handler
   * @param handlerObject Request Handler Object
   * @returns
   */
  public add(version: string | string[], handlerObject: TRequestHandlerObject) {
    this.Map.set(version, handlerObject);
    return this;
  }

  public toMap() {
    return this.Map;
  }
}

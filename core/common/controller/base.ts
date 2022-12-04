// deno-lint-ignore-file no-explicit-any
import { Reflect } from "reflect";
import { RequestMethod } from "../route/decorator.ts";
import { Response } from "../response.ts";

export enum ControllerMetadataKey {
  OPTIONS = "options",
  ROUTES = "routes",
}

export interface IControllerOptions {
  name: string;
  description?: string;
  prefix: string;
  childs:
    | typeof BaseController[]
    | (() => typeof BaseController[] | Promise<typeof BaseController[]>);
}

export interface IRouteOptions {
  name: string;
  description?: string;
  method: RequestMethod;
  path: string;
  requestHandler: TRequestHandler;
  controller: typeof BaseController;
}

export interface IRequestContext<Router = any> {
  id: string;
  router: Router;
  options: IRouteOptions;
}

export type TRequestHandler = (
  ctx: IRequestContext,
  ...args: any[]
) => Promise<void | Response> | void | Response;

export class BaseController {
  static setOptions<T>(this: T, options: IControllerOptions) {
    Reflect.defineMetadata(ControllerMetadataKey.OPTIONS, options, this);
  }

  static getOptions<T>(this: T): IControllerOptions | null {
    return Reflect.getMetadata(ControllerMetadataKey.OPTIONS, this) ?? null;
  }

  static setRoutes<T>(this: T, routes: Record<string, IRouteOptions>) {
    Reflect.defineMetadata(ControllerMetadataKey.ROUTES, routes, this);
  }

  static getRoutes<T>(this: T): Record<string, IRouteOptions> {
    return Reflect.getMetadata(ControllerMetadataKey.ROUTES, this) ?? {};
  }
}

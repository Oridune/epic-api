// deno-lint-ignore-file no-explicit-any
import { Reflect } from "reflect";
import { RequestMethod } from "../route/decorator.ts";
import { Response } from "../response.ts";

export enum ControllerMetadataKey {
  OPTIONS = "options",
  ROUTES = "routes",
}

export type TMiddleware = (...args: any[]) => any;

export interface IControllerOptions {
  name: string;
  description?: string;
  group?: string;
  prefix: string;
  childs:
    | typeof BaseController[]
    | (() => typeof BaseController[] | Promise<typeof BaseController[]>);
  middlewares: TMiddleware[] | (() => TMiddleware[] | Promise<TMiddleware[]>);
}

export interface IRouteOptions {
  name: string;
  description?: string;
  scope?: string;
  method: RequestMethod;
  path: string;
  requestHandler: TRequestHandler;
  controller: typeof BaseController;
  middlewares: TMiddleware[] | (() => TMiddleware[] | Promise<TMiddleware[]>);
}

export interface IRequestContext<RouterContext = any> {
  id: string;
  router: RouterContext & IRouterContextExtendor;
  options: IRouteOptions;
}

export interface IRouterContextExtendor {}

export type TRequestHandler = (
  ctx: IRequestContext,
  ...args: any[]
) => Promise<void | Response> | void | Response;

export class BaseController {
  /**
   * Set controller options
   * @param options
   */
  static setOptions<T>(this: T, options: IControllerOptions) {
    Reflect.defineMetadata(ControllerMetadataKey.OPTIONS, options, this);
  }

  /**
   * Get controller options
   * @returns
   */
  static getOptions<T>(this: T): IControllerOptions | null {
    return Reflect.getMetadata(ControllerMetadataKey.OPTIONS, this) ?? null;
  }

  /**
   * Update the routes of the current controller
   * @param routes
   */
  static setRoutes<T>(this: T, routes: Record<string, IRouteOptions>) {
    Reflect.defineMetadata(ControllerMetadataKey.ROUTES, routes, this);
  }

  /**
   * Get all routes available on the current controller
   * @returns
   */
  static getRoutes<T>(this: T): Record<string, IRouteOptions> {
    return Reflect.getMetadata(ControllerMetadataKey.ROUTES, this) ?? {};
  }
}

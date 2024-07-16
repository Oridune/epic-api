// deno-lint-ignore-file no-explicit-any no-empty-interface
import { Reflect } from "reflect";
import { RequestMethod } from "../route/decorator.ts";
import { Versioned } from "../versioned.ts";
import { RawResponse, Response } from "../response.ts";

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
    | (typeof BaseController)[]
    | (() => (typeof BaseController)[] | Promise<(typeof BaseController)[]>);
  middlewares: TMiddleware[] | (() => TMiddleware[] | Promise<TMiddleware[]>);
}

export interface IRouteOptions {
  name: string;
  description?: string;
  scope?: string;
  method: RequestMethod;
  path: string;
  buildRequestHandler: TBuildRequestHandler;
  controller: typeof BaseController;
  middlewares: TMiddleware[] | (() => TMiddleware[] | Promise<TMiddleware[]>);
}

export interface IRoute {
  group: string;
  scope: string;
  endpoint: string;
  options: IRouteOptions;
}

export interface IRouterContextExtendor {}

export interface IRequestHandlerObjectExtendor {}

export interface IRequestContext<RouterContext = any> {
  requestedVersion: string;
  version: string;
  id: string;
  router: RouterContext & IRouterContextExtendor;
  routes: IRoute[];
  options: IRouteOptions;
}

export type TResponse = void | RawResponse | Response;

export type TRequestHandler = (
  ctx: IRequestContext,
  ...args: any[]
) => Promise<TResponse> | TResponse;

export type TRequestHandlerObject = IRequestHandlerObjectExtendor & {
  handler: TRequestHandler;
  [K: string]: any;
};

export type TRequestHandlerReturn =
  | TRequestHandler
  | TRequestHandlerObject
  | Versioned
  | Promise<TRequestHandler | TRequestHandlerObject | Versioned>;

export type TRequestHandlerFactory = (
  route: IRoute,
  ...params: any
) => TRequestHandlerReturn;

export type TBuildRequestHandlerResult = {
  version: string;
  object: TRequestHandlerObject | void;
};

export type TBuildRequestHandler = (
  route: IRoute,
  options?: {
    /**
     * Pass a specific version to compile handler to...
     */
    version?: string | null;

    /**
     * Once a handler is compiled, the handler factory is cached into the memory to increase the performance.
     *
     * Passing fresh `true` will disable factory caching.
     */
    fresh?: boolean;
  },
) =>
  | TBuildRequestHandlerResult
  | void
  | Promise<TBuildRequestHandlerResult | void>;

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

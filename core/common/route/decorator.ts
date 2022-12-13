import {
  BaseController,
  IRouteOptions,
  TRequestHandler,
} from "../controller/base.ts";

export enum RequestMethod {
  GET = "get",
  POST = "post",
  PATCH = "patch",
  PUT = "put",
  DELETE = "delete",
  OPTIONS = "options",
}

export interface IRouteHandlerDescriptor extends PropertyDescriptor {
  value?: TRequestHandler;
}

export const Route =
  (method: RequestMethod) =>
  (
    path = "/",
    options?: Partial<
      Omit<IRouteOptions, "method" | "path" | "requestHandler">
    > & { disabled?: boolean }
  ) =>
  // deno-lint-ignore no-explicit-any
  (target: any, key: string, desc: IRouteHandlerDescriptor) => {
    if (!options?.disabled)
      if (typeof target === "object") {
        // Resolve Prototype
        if (target.toString().substring(0, 5) !== "class")
          target = target.constructor;

        const ControllerConstructor = target as typeof BaseController;
        const ControllerRoutes = ControllerConstructor.getRoutes();

        if (typeof desc.value === "function") {
          const Name = options?.name ?? key;

          ControllerRoutes[Name] = {
            name: Name,
            description: options?.description,
            method,
            path,
            requestHandler: desc.value,
            controller: target,
            middlewares: options?.middlewares ?? [],
          };

          ControllerConstructor.setRoutes(ControllerRoutes);
        }
      } else throw new Error(`Invalid route target!`);
  };

// Available Request Method Decorators
export const Get = Route(RequestMethod.GET);
export const Post = Route(RequestMethod.POST);
export const Patch = Route(RequestMethod.PATCH);
export const Put = Route(RequestMethod.PUT);
export const Delete = Route(RequestMethod.DELETE);
export const Options = Route(RequestMethod.OPTIONS);

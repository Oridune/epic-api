import {
  BaseController,
  type IRouteOptions,
  type TRequestHandler,
  type TRequestHandlerFactory,
  type TRequestHandlerObject,
} from "../controller/base.ts";
import { Versioned } from "../versioned.ts";
import { semverResolve } from "../semver.ts";

export enum RequestMethod {
  GET = "get",
  POST = "post",
  PATCH = "patch",
  PUT = "put",
  DELETE = "delete",
  OPTIONS = "options",
}

export interface IRouteHandlerDescriptor extends PropertyDescriptor {
  value?: TRequestHandlerFactory;
}

export const Route =
  (method: RequestMethod) =>
  (
    path = "/",
    options?: Partial<
      Omit<IRouteOptions, "method" | "path" | "buildRequestHandler">
    > & { disabled?: boolean }
  ) =>
  // deno-lint-ignore no-explicit-any
  (target: any, key: string, desc: IRouteHandlerDescriptor) => {
    if (!options?.disabled)
      if (["object", "function"].includes(typeof target)) {
        // Resolve Prototype
        if (target.toString().substring(0, 5) !== "class")
          target = target.constructor;

        const ControllerConstructor = target as typeof BaseController;
        const ControllerRoutes = ControllerConstructor.getRoutes();

        if (typeof desc.value === "function") {
          const Factory = desc.value;
          const Name = options?.name ?? key;

          let FactoryResults:
            | TRequestHandlerObject
            | TRequestHandler
            | Versioned
            | undefined;

          ControllerRoutes[`${method}:${Name}`] = {
            name: Name,
            description: options?.description,
            scope: options?.scope,
            method,
            path,
            buildRequestHandler: async (route, options) => {
              const Handler = await (async () => {
                if (options?.fresh) return await Factory(route);
                return (FactoryResults ??= await Factory(route));
              })();

              if (Handler instanceof Versioned) {
                if (!options?.version) return;

                const VersionMap = Handler.toMap();
                const MapKeys = Array.from(VersionMap.keys());
                const Versions = MapKeys.reduce<string[]>(
                  (list, v) => [
                    ...list,
                    ...(v instanceof Array ? v : [v]).filter(
                      (_) => typeof _ === "string"
                    ),
                  ],
                  []
                );

                const Version = semverResolve(options.version, Versions, true);

                if (!Version) return;

                return {
                  version: Version,
                  object: VersionMap.get(
                    MapKeys.find((key) =>
                      key instanceof Array
                        ? key.includes(Version)
                        : key === Version
                    )!
                  ),
                };
              } else if (typeof Handler === "function")
                return {
                  version: "latest",
                  object: {
                    handler: Handler,
                  },
                };
              else if (
                typeof Handler === "object" &&
                typeof Handler?.handler === "function"
              )
                return {
                  version: "latest",
                  object: Handler,
                };
            },
            controller: target,
            middlewares: options?.middlewares ?? [],
          };

          ControllerConstructor.setRoutes(ControllerRoutes);
        }
      } else
        throw new Error(
          `Invalid route decorator target ${target} of type ${typeof target}!`
        );
  };

// Available Request Method Decorators
export const Get = Route(RequestMethod.GET);
export const Post = Route(RequestMethod.POST);
export const Patch = Route(RequestMethod.PATCH);
export const Put = Route(RequestMethod.PUT);
export const Delete = Route(RequestMethod.DELETE);
export const Options = Route(RequestMethod.OPTIONS);

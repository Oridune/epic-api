import {
  BaseController,
  IControllerOptions,
  IRoute,
} from "./controller/base.ts";

export class Server {
  protected Routes: IRoute[] = [];

  protected async collectRoutes(
    controller: typeof BaseController,
    routes: IRoute[],
    options: {
      group: string;
      prefix: string;
    } = {
      group: "/",
      prefix: "/",
    }
  ) {
    const ResolvedGroup = options.group.split("/").filter(Boolean);
    const ResolvedPrefix = options.prefix.split("/").filter(Boolean);

    const ControllerOptions = controller.getOptions();

    if (ControllerOptions) {
      const ResolvedControllerGroup = (ControllerOptions.group ?? "/")
        .split("/")
        .filter(Boolean);

      const ResolvedControllerPrefix = ControllerOptions.prefix
        .split("/")
        .filter(Boolean);

      const RouteOptions = Object.values(controller.getRoutes());

      RouteOptions.forEach((options) => {
        const GroupPath = [...ResolvedGroup, ...ResolvedControllerGroup].join(
          "/"
        );
        const ResolvedGroupPath = GroupPath ? `/${GroupPath}` : "/";

        const ResolvedPath = options.path.split("/").filter(Boolean);
        const Endpoint = [
          ...ResolvedPrefix,
          ...ResolvedControllerPrefix,
          ...ResolvedPath,
        ].join("/");
        const ResolvedEndpoint = Endpoint ? `/${Endpoint}` : "/";

        routes.push({
          group: ResolvedGroupPath,
          scope: options.scope ?? ControllerOptions.name,
          endpoint: ResolvedEndpoint,
          options,
        });
      });

      await Promise.all(
        (ControllerOptions.childs instanceof Array
          ? ControllerOptions.childs
          : await ControllerOptions.childs()
        ).map((controller) =>
          this.collectRoutes(controller, routes, {
            group: [...ResolvedGroup, ...ResolvedControllerGroup].join("/"),
            prefix: [...ResolvedPrefix, ...ResolvedControllerPrefix].join("/"),
          })
        )
      );
    }
  }

  constructor(protected Controller: typeof BaseController) {}

  /**
   * Pass a callback function for preparing the server with your favorite API framework.
   *
   * Callback will be called with the routes array and controller options, you can use this information to create a server.
   * @param callback
   */
  async prepare<T>(
    callback: (
      routes: IRoute[],
      options: IControllerOptions | null
    ) => Promise<T> | T
  ) {
    if (!this.Routes.length)
      await this.collectRoutes(this.Controller, this.Routes);
    return await callback(this.Routes, this.Controller.getOptions());
  }
}

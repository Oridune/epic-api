import {
  BaseController,
  IControllerOptions,
  IRouteOptions,
} from "./controller/base.ts";

export interface IRoute {
  endpoint: string;
  options: IRouteOptions;
}

export class ApiServer {
  protected Routes: IRoute[] = [];

  protected async collectRoutes(
    controller: typeof BaseController,
    routes: IRoute[],
    prefix = "/"
  ) {
    const ResolvedPrefix = prefix.split("/").filter(Boolean);

    const ControllerOptions = controller.getOptions();

    if (ControllerOptions) {
      const ResolveControllerPrefix = ControllerOptions.prefix
        .split("/")
        .filter(Boolean);

      const RouteOptions = Object.values(controller.getRoutes());

      RouteOptions.forEach((options) => {
        const ResolvedPath = options.path.split("/").filter(Boolean);
        const Endpoint = [
          ...ResolvedPrefix,
          ...ResolveControllerPrefix,
          ...ResolvedPath,
        ].join("/");
        const ResolvedEndpoint = Endpoint ? `/${Endpoint}` : "/";
        routes.push({ endpoint: ResolvedEndpoint, options });
      });

      (ControllerOptions.childs instanceof Array
        ? ControllerOptions.childs
        : await ControllerOptions.childs()
      ).forEach((controller) =>
        this.collectRoutes(
          controller,
          routes,
          [...ResolvedPrefix, ...ResolveControllerPrefix].join("/")
        )
      );
    }
  }

  constructor(protected Controller: typeof BaseController) {}

  async create(
    callback: (
      routes: IRoute[],
      options: IControllerOptions | null
    ) => Promise<void> | void
  ) {
    if (!this.Routes.length)
      await this.collectRoutes(this.Controller, this.Routes);
    await callback(this.Routes, this.Controller.getOptions());
  }
}

import { BaseController, IRouteOptions } from "./controller/base.ts";

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

  constructor(protected MainController: typeof BaseController) {}

  async create(callback: (routes: IRoute[]) => Promise<void> | void) {
    await this.collectRoutes(this.MainController, this.Routes);
    await callback(this.Routes);
  }
}

import { BaseController, IControllerOptions } from "./base.ts";

export const Controller =
  (
    prefix = "/",
    options?: Partial<Omit<IControllerOptions, "prefix" | "routes">>
  ) =>
  (constructor: typeof BaseController) =>
    constructor.setOptions({
      name: options?.name ?? constructor.name,
      description: options?.description,
      prefix,
      childs: options?.childs ?? [],
      middlewares: options?.middlewares ?? [],
    });

import { Application } from "oak/application.ts";

export const fetch = (
  app: Application,
  url: string | URL,
  config?: RequestInit | undefined,
) => {
  config = config ?? {};

  if (["get", "head"].includes(config.method?.toLowerCase() ?? "get")) {
    delete config.body;
  }

  return app.handle(
    new Request(
      url,
      config,
    ),
  );
};

export const prepareFetch = (app: Application) =>
(
  ...params: Parameters<typeof fetch> extends [infer _, ...infer R] ? R
    : never
) => {
  if (!app) throw new Error(`App server not started yet!`);

  return fetch(app, params[0], params[1]);
};

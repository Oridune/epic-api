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

import { Loader, Env } from "@Core/common/mod.ts";
import { startAppServer } from "@Core/server.ts";

if (import.meta.main) {
  await Loader.load({ excludeTypes: ["templates"] });

  const { app, signal, end } = await startAppServer();

  (["SIGINT", "SIGBREAK", "SIGTERM"] satisfies Deno.Signal[]).map((_) => {
    try {
      Deno.addSignalListener(_, async () => {
        await end();
        Deno.exit();
      });
    } catch {
      // Do nothing...
    }
  });

  app.addEventListener("listen", ({ port }) =>
    console.info(
      `${Env.getType().toUpperCase()} Server is listening on Port: ${port}`
    )
  );

  await app.listen({
    port: parseInt((await Env.get("PORT", true)) || "8080"),
    signal,
  });
}

import { startAppServer, App } from "@Core/server.ts";
import { Env } from "@Core/common/env.ts";

const { signal, end } = await startAppServer(App);

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

App.addEventListener("listen", ({ port }) =>
  console.info(
    `${Env.getType().toUpperCase()} Server is listening on Port: ${port}`
  )
);

await App.listen({
  port: parseInt((await Env.get("PORT", true)) || "8080"),
  signal,
});

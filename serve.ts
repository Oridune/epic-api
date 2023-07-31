import { Loader } from "@Core/common/mod.ts";
import { startAppServer } from "@Core/server.ts";

if (import.meta.main) {
  await Loader.load({ excludeTypes: ["templates"] });

  const { start, end } = await startAppServer();

  await start();

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
}

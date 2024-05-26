import "./index.d.ts";

import { Loader } from "@Core/common/mod.ts";
import { createAppServer } from "@Core/server.ts";

if (import.meta.main) {
  await Loader.load({ excludeTypes: ["templates", "models"] });

  const { start, end } = createAppServer();

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

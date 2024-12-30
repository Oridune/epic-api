import "./index.d.ts";

import { getMemoryUsageDetails, Loader } from "@Core/common/mod.ts";
import { createAppServer } from "@Core/server.ts";

if (import.meta.main) {
  console.time("Server Startup Time:");

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

  console.timeEnd("Server Startup Time:");
  console.log(
    "Initial Memory Footprint:",
    getMemoryUsageDetails({
      project: {
        usageMb: 1,
        rssPercentage: 1,
        heapPercentage: 1,
      },
    }),
  );
}

// deno-lint-ignore-file no-explicit-any
import { Context, Router, Status } from "oak";
import { Env } from "@Core/common/env.ts";

const inspectorHost = `localhost:${
  Env.getSync("INSPECTOR_PORT", true) ?? 9229
}`;

export const takeHeapSnapshot = async (fileName?: string) => {
  // Take the inspector websocket url
  const response = await fetch(`http://${inspectorHost}/json`);
  const targets = await response.json() as any;

  if (!targets.length) {
    throw new Error(
      "No targets found. Ensure the app is running with --inspect.",
    );
  }

  const webSocketUrl = targets[0].webSocketDebuggerUrl;

  // Send command to take heap snapshot
  return await new Promise<string>((resolve) => {
    const socket = new WebSocket(webSocketUrl);

    socket.onopen = async () => {
      // Enable Heap Profiler
      socket.send(JSON.stringify({ id: 1, method: "HeapProfiler.enable" }));

      // Take Heap Snapshot
      socket.send(
        JSON.stringify({ id: 2, method: "HeapProfiler.takeHeapSnapshot" }),
      );

      const snapshotFileName = fileName ?? "epic_api.heapsnapshot";
      const tempSnapshotPath = await Deno.makeTempFile({
        prefix: snapshotFileName,
      });
      const snapshotFile = await Deno.open(tempSnapshotPath, {
        create: true,
        write: true,
        truncate: true,
      });

      // Receive Snapshot Data
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as any;

        // Write snapshot data chunks to file
        if (message.method === "HeapProfiler.addHeapSnapshotChunk") {
          const chunk = message.params.chunk;
          snapshotFile.writeSync(new TextEncoder().encode(chunk));
        }

        // Snapshot completed
        if (message.id === 2) {
          snapshotFile.close();
          socket.close();
          resolve(tempSnapshotPath);
        }
      };
    };
  });
};

export const serveInspector = () =>
async (
  ctx: Context<Record<string, any>, Record<string, any>>,
  next: () => Promise<unknown>,
) => {
  if (ctx.isUpgradable) {
    const ws = new WebSocket(
      `ws://${inspectorHost}${ctx.request.url.pathname}`,
    );

    const clientSocket = ctx.upgrade();
    const messageStack: any[] = [];

    clientSocket.onmessage = (message) => {
      messageStack.push(message);
    };

    // Wait for the WebSocket connection to be open
    ws.onopen = () => {
      clientSocket.onmessage = (message) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message.data);
        }
      };

      ws.onmessage = (message) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(message.data);
        }
      };

      ws.onclose = () => {
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.close();
        }
      };

      for (const msg of messageStack) {
        ws.send(msg.data);
      }
    };

    clientSocket.onclose = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    ctx.response.status = Status.Accepted;
  } else {
    try {
      const url = new URL(
        ctx.request.url.pathname,
        `http://${inspectorHost}`,
      );

      const res = await fetch(url.href, {
        method: ctx.request.method,
        headers: new Headers(ctx.request.headers),
        body: ctx.request.hasBody ? await ctx.request.body.json() : undefined,
      });

      if (res.status >= 400) {
        throw new Error(`Response status is: ${res.status}`);
      }

      ctx.response.status = res.status;

      res.headers.forEach((v, k) => ctx.response.headers.append(k, v));

      ctx.response.body = (await res.text())
        .replace(`"title":"`, `"title":"Oridune - `)
        .replaceAll(
          inspectorHost,
          ctx.request.url.host,
        ).replaceAll(
          "https://deno.land/favicon.ico",
          "https://oridune.com/assets/oridune-8999a42e.svg",
        );
    } catch {
      await next();
    }
  }
};

export const useV8Inspector = (router: Router): (
  ctx: Context<Record<string, any>, Record<string, any>>,
  next: () => Promise<unknown>,
) => void => {
  if (Env.enabledSync("INSPECTOR_ENABLED")) {
    router.get("/:type(json|ws)/:path*", serveInspector());

    return async (ctx, next) => {
      ctx.takeHeapSnapshot = takeHeapSnapshot;

      await next();
    };
  }

  return async (_, next) => {
    await next();
  };
};

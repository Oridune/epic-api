// deno-lint-ignore-file no-explicit-any
import { Context, Status } from "oak";
import { Env } from "@Core/common/env.ts";

export const serveInspector = () =>
async (
  ctx: Context<Record<string, any>, Record<string, any>>,
  next: () => Promise<unknown>,
) => {
  if (Env.enabledSync("INSPECTOR_ENABLED")) {
    const inspectorHost = "localhost:9229";

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
  } else await next();
};

import { Loader } from "@Core/common/mod.ts";
import { startAppServer } from "@Core/server.ts";
import { expect } from "expect";

Deno.test({
  name: "Basic Flow Test",
  async fn(t) {
    await Loader.load({ excludeTypes: ["templates"] });

    const { start, end } = await startAppServer();

    const { port } = await start();

    const APIHost = `http://localhost:${port}`;

    await t.step("GET / Should return 404 not found", async () => {
      const Response = await fetch(new URL("/", APIHost));

      expect(Response.headers.get("X-Request-ID")).toMatch(/.*/);
      expect(Response.headers.get("X-Rate-Limit-Reset")).toMatch(/[0-9]+/);
      expect(Response.headers.get("X-Rate-Limit-Limit")).toMatch(/[0-9]+/);
      expect(Response.headers.get("X-Rate-Limit-Remaining")).toMatch(/[0-9]+/);
      expect(Response.headers.get("Content-Type")).toMatch(/json/);
      expect(Response.status).toBe(404);
    });

    await t.step("GET /api/ Should return 200 ok", async () => {
      const Response = await fetch(new URL("/api/", APIHost));

      expect(Response.headers.get("X-Request-ID")).toMatch(/.*/);
      expect(Response.headers.get("X-Rate-Limit-Reset")).toMatch(/[0-9]+/);
      expect(Response.headers.get("X-Rate-Limit-Limit")).toMatch(/[0-9]+/);
      expect(Response.headers.get("X-Rate-Limit-Remaining")).toMatch(/[0-9]+/);
      expect(Response.headers.get("Content-Type")).toMatch(/json/);
      expect(Response.status).toBe(200);
      expect(await Response.text()).toBe(
        JSON.stringify({
          status: true,
          messages: [{ message: "Hurry! The API is online!" }],
        })
      );
    });

    await t.step(
      "GET /api/ Should return 200 ok for x-App-version latest",
      async () => {
        const Response = await fetch(new URL("/api/", APIHost), {
          headers: {
            "x-App-version": "latest",
          },
        });

        expect(Response.headers.get("Content-Type")).toMatch(/json/);
        expect(Response.status).toBe(200);
        expect(await Response.text()).toBe(
          JSON.stringify({
            status: true,
            messages: [{ message: "Hurry! The API is online!" }],
          })
        );
      }
    );

    await t.step(
      "GET /api/test/ Should return 200 ok for x-App-version ^1.0.0",
      async () => {
        const Response = await fetch(new URL("/api/test/", APIHost), {
          headers: {
            "x-App-version": "^1.0.0",
          },
        });

        expect(Response.headers.get("Content-Type")).toMatch(/json/);
        expect(Response.status).toBe(200);
        expect(await Response.text()).toMatch(
          /Another test was successful from API version 1.0.5!/
        );
      }
    );

    await t.step(
      "GET /api/test/ Should return 404 not found for x-App-version 2.0.0",
      async () => {
        const Response = await fetch(new URL("/api/test/", APIHost), {
          headers: {
            "x-App-version": "2.0.0",
          },
        });

        expect(Response.status).toBe(404);
      }
    );

    await t.step(
      "GET /api/ Should return 429 too many requests error",
      async () => {
        const RequestLimit = 50;

        await Promise.all(
          new Array(RequestLimit)
            .fill(null)
            .map(() => fetch(new URL("/", APIHost)))
        );

        const Response = await fetch(new URL("/api/", APIHost));

        expect(Response.headers.get("Content-Type")).toMatch(/json/);
        expect(Response.headers.get("X-Rate-Limit-Reset")).toMatch(/[0-9]+/);
        expect(Response.headers.get("X-Rate-Limit-Limit")).toMatch(
          RequestLimit.toString()
        );
        expect(Response.headers.get("X-Rate-Limit-Remaining")).toMatch("0");
        expect(Response.status).toBe(429);
      }
    );

    await end();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

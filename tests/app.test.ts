import "../index.d.ts";

import { EnvType, Loader, StoreType } from "@Core/common/mod.ts";
import { createAppServer } from "@Core/server.ts";
import { expect } from "expect";
import { Database } from "@Database";
import e from "validator";

Deno.test({
  name: "Basic Flow Test",
  async fn(t) {
    await Loader.load({ excludeTypes: ["templates", "models"] });

    const { fetch, start, end, restart } = createAppServer();

    // Database Cleanup
    Database.connection.post("connect", () => Database.connection.drop());

    const { port } = await start();

    const APIHost = `http://localhost:${port}`;

    await restart();

    const ResponseSchema = e.object(
      {
        status: e.boolean(),
        messages: e.array(e.object({ message: e.string() })),
        data: e.object({
          environment: e.in(Object.values(EnvType)),
          database: e.object({
            connected: e.boolean(),
          }),
          store: e.object({
            type: e.in(Object.values(StoreType)),
            connected: e.boolean(),
          }),
        }),
        metrics: e.record(e.any()),
      },
      { cast: true },
    );

    await t.step("GET / Should return 404 not found", async () => {
      const Response = await fetch(new URL("/", APIHost));

      expect(Response?.headers.get("X-Request-ID")).toMatch(/.*/);
      expect(Response?.headers.get("X-Rate-Limit-Reset")).toMatch(/[0-9]+/);
      expect(Response?.headers.get("X-Rate-Limit-Limit")).toMatch(/[0-9]+/);
      expect(Response?.headers.get("X-Rate-Limit-Remaining")).toMatch(/[0-9]+/);
      expect(Response?.headers.get("Content-Type")).toMatch(/json/);
      expect(Response?.status).toBe(404);
    });

    await t.step("GET /api/ Should return 200 ok", async () => {
      const Response = await fetch(new URL("/api/", APIHost));

      expect(Response?.headers.get("X-Request-ID")).toMatch(/.*/);
      expect(Response?.headers.get("X-Rate-Limit-Reset")).toMatch(/[0-9]+/);
      expect(Response?.headers.get("X-Rate-Limit-Limit")).toMatch(/[0-9]+/);
      expect(Response?.headers.get("X-Rate-Limit-Remaining")).toMatch(/[0-9]+/);
      expect(Response?.headers.get("Content-Type")).toMatch(/json/);
      expect(Response?.status).toBe(200);

      await ResponseSchema.validate(JSON.parse(await Response?.text() ?? ""))
        .catch(
          (error) => {
            console.error(error);
            throw error;
          },
        );
    });

    await t.step(
      "GET /api/ Should return 200 ok with translation",
      async () => {
        const Response = await fetch(new URL("/api/", APIHost), {
          headers: new Headers({ "Accept-Language": "ar" }),
        });

        expect(Response?.status).toBe(200);

        const Data = await ResponseSchema.validate(
          (await Response?.json()) ?? {},
        )
          .catch(
            (error) => {
              console.error(error);
              throw error;
            },
          );

        expect(Data.messages[0].message).not.toMatch(/^Hurry/);
      },
    );

    await t.step(
      "GET /api/ Should return 200 ok for x-App-version latest",
      async () => {
        const Response = await fetch(new URL("/api/", APIHost), {
          headers: {
            "x-App-version": "latest",
          },
        });

        expect(Response?.headers.get("Content-Type")).toMatch(/json/);
        expect(Response?.status).toBe(200);

        const Body = await Response?.text();

        await ResponseSchema.validate(Body).catch((error) => {
          console.error(error);
          throw error;
        });
      },
    );

    await t.step(
      "GET /api/test/ Should return 200 ok for x-App-version ^1.0.0",
      async () => {
        const Response = await fetch(new URL("/api/test/", APIHost), {
          headers: {
            "x-App-version": "^1.0.0",
          },
        });

        expect(Response?.headers.get("Content-Type")).toMatch(/json/);
        expect(Response?.status).toBe(200);
        expect(await Response?.text()).toMatch(
          /Latest test was successful from API version 1.0.5!/,
        );
      },
    );

    await t.step(
      "GET /api/test/ Should return 404 not found for x-App-version 2.0.0",
      async () => {
        const Response = await fetch(new URL("/api/test/", APIHost), {
          headers: {
            "x-App-version": "2.0.0",
          },
        });

        expect(Response?.status).toBe(404);
      },
    );

    await t.step(
      "GET /api/ Should return 429 too many requests error",
      async () => {
        const RequestLimit = 50;

        await Promise.all(
          new Array(RequestLimit)
            .fill(null)
            .map(() => fetch(new URL("/", APIHost))),
        );

        const Response = await fetch(new URL("/api/", APIHost));

        expect(Response?.headers.get("Content-Type")).toMatch(/json/);
        expect(Response?.headers.get("X-Rate-Limit-Reset")).toMatch(/[0-9]+/);
        expect(Response?.headers.get("X-Rate-Limit-Limit")).toMatch(
          RequestLimit.toString(),
        );
        expect(Response?.headers.get("X-Rate-Limit-Remaining")).toMatch("0");
        expect(Response?.status).toBe(429);
      },
    );

    await end();
  },
});

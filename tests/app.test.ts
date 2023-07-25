import { Loader } from "@Core/common/mod.ts";
import { startAppServer } from "@Core/server.ts";
import { superoak } from "oak:testing";

Deno.test({
  name: "Basic Flow Test",
  async fn(t) {
    await Loader.load({ excludeTypes: ["templates"] });

    const { app, end } = await startAppServer();

    await t.step("/ Should return 404 not found", async () => {
      const Request = await superoak(app);
      await Request.get("/")
        .expect("X-Request-ID", /.*/)
        .expect("X-Rate-Limit-Reset", /[0-9]+/)
        .expect("X-Rate-Limit-Limit", /[0-9]+/)
        .expect("X-Rate-Limit-Remaining", /[0-9]+/)
        .expect("Content-Type", /json/)
        .expect(404);
    });

    await t.step("/api/ Should return 200 ok", async () => {
      const Request = await superoak(app);
      await Request.get("/api/")
        .expect(200)
        .expect("X-Request-ID", /.*/)
        .expect("X-Rate-Limit-Reset", /[0-9]+/)
        .expect("X-Rate-Limit-Limit", /[0-9]+/)
        .expect("X-Rate-Limit-Remaining", /[0-9]+/)
        .expect("Content-Type", /json/)
        .expect(
          JSON.stringify({
            status: true,
            messages: [{ message: "Hurry! The API is online!" }],
          })
        );
    });

    await t.step(
      "/api/ Should return 200 ok for x-App-version latest",
      async () => {
        const Request = await superoak(app);
        await Request.get("/api/")
          .set("x-App-version", "latest")
          .expect(200)
          .expect("Content-Type", /json/)
          .expect(
            JSON.stringify({
              status: true,
              messages: [{ message: "Hurry! The API is online!" }],
            })
          );
      }
    );

    await t.step(
      "/api/test/ Should return 200 ok for x-App-version ^1.0.0",
      async () => {
        const Request = await superoak(app);
        await Request.get("/api/test/")
          .set("x-App-version", "^1.0.0")
          .expect(200)
          .expect("Content-Type", /json/)
          .expect(/Another test was successful from API version 1.0.5!/);
      }
    );

    await t.step(
      "/api/test/ Should return 404 not found for x-App-version 2.0.0",
      async () => {
        const Request = await superoak(app);
        await Request.get("/api/test/")
          .set("x-App-version", "2.0.0")
          .expect(404);
      }
    );

    await t.step(
      "/api/ Should return 429 too many requests error",
      async () => {
        const RequestLimit = 50;

        for (let i = 0; i < RequestLimit; i++) {
          const Request = await superoak(app);
          await Request.get("/");
        }

        const Request = await superoak(app);
        await Request.get("/api/")
          .expect("Content-Type", /json/)
          .expect("X-Rate-Limit-Reset", /[0-9]+/)
          .expect("X-Rate-Limit-Limit", RequestLimit.toString())
          .expect("X-Rate-Limit-Remaining", "0")
          .expect(429);
      }
    );

    await end();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

import { superoak } from "oak:testing";
import { App, startAppServer } from "@Core/server.ts";

Deno.test("Basic Flow Test", async (t) => {
  const { end } = await startAppServer(App);

  await t.step("/ Should return 404 not found", async () => {
    const Request = await superoak(App);
    await Request.get("/").expect(404);
  });

  await t.step("/api/ Should return 200 ok", async () => {
    const Request = await superoak(App);
    await Request.get("/api/")
      .expect(200)
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
      const Request = await superoak(App);
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
      const Request = await superoak(App);
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
      const Request = await superoak(App);
      await Request.get("/api/test/").set("x-App-version", "2.0.0").expect(404);
    }
  );

  await end();
});

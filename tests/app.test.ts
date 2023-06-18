import { superoak } from "oak:testing";
import { App, prepareAppServer, startBackgroundJobs } from "@Core/server.ts";

await prepareAppServer(App);
await startBackgroundJobs();

Deno.test("/ Should return 404 not found", async () => {
  const Request = await superoak(App);
  await Request.get("/").expect(404);
});

Deno.test("/api/ Should return 200 ok", async () => {
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

Deno.test("/api/ Should return 200 ok for x-App-version latest", async () => {
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
});

Deno.test(
  "/api/test/ Should return 200 ok for x-App-version ^1.0.0",
  async () => {
    const Request = await superoak(App);
    await Request.get("/api/test/")
      .set("x-App-version", "^1.0.0")
      .expect(200)
      .expect("Content-Type", /json/)
      .expect(/Your test was successful from API version 1.0.5!/);
  }
);

Deno.test(
  "/api/test/ Should return 404 not found for x-App-version 2.0.0",
  async () => {
    const Request = await superoak(App);
    await Request.get("/api/test/")
      .set("x-App-version", "2.0.0")
      .expect(404)
      .expect("Content-Type", /json/)
      .expect(
        JSON.stringify({
          status: false,
          messages: [{ message: "Route not found!" }],
        })
      );
  }
);

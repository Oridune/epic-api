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

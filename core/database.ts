import { Database, MongoDBConnector } from "deno:db";
import { Env } from "@Core/env.ts";
import { Manager } from "@Core/common/mod.ts";

export default new Database(
  new MongoDBConnector({
    uri: Env.get("DATABASE_CONNECTION_STRING"),
    database: Env.get("DATABASE_NAME"),
  })
).link(await Manager.load("models"));

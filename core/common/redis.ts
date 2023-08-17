import { Env } from "./env.ts";
import { connect } from "redis";

export * from "redis";

const RedisConnectionString = Env.getSync("REDIS_CONNECTION_STRING", true);

const { hostname, port, password } = RedisConnectionString
  ? new URL(RedisConnectionString)
  : ({} as URL);

export const GlobalRedisClient = RedisConnectionString
  ? await connect({
      hostname,
      port,
      password,
    }).catch(console.error)
  : undefined;

console.log(
  "Redis Connection:",
  hostname,
  port,
  "Connected:",
  !!GlobalRedisClient
);

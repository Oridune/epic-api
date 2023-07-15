import mongoose from "mongoose";
import { Env, EnvType } from "@Core/common/env.ts";

export const connectDatabase = async () => {
  const Connection = await mongoose.connect(
    (await Env.get("DATABASE_CONNECTION_STRING", true)) ??
      "mongodb://localhost:27017/epic-api"
  );

  Connection.set("debug", Env.is(EnvType.DEVELOPMENT));

  return Connection;
};

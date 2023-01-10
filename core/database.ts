import mongoose from "mongoose";
import { Env } from "@Core/common/env.ts";

export const connectDatabase = async () => {
  const connection = await mongoose.connect(
    await Env.get("DATABASE_CONNECTION_STRING")
  );

  connection.set("debug", true);
};

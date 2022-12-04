import mongoose from "mongoose";
import { Env } from "@Core/common/env.ts";

await mongoose.connect(Env.get("DATABASE_CONNECTION_STRING"));

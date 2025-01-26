import { Env } from "@Core/common/env.ts";

export const PORT = parseInt(Env.getSync("PORT", true) || "3742");

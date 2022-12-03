import Connection from "@Core/database.ts";

export const syncDatabase = () => Connection.sync();

if (import.meta.main) await syncDatabase();

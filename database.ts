import mongoose from "mongoose";
import { Env, EnvType } from "@Core/common/env.ts";

export class Database {
  /**
   * The database connection driver
   */
  static connection?: typeof mongoose;

  /**
   * Get current database connection
   * @returns
   */
  static get() {
    if (!Database.connection) throw new Error(`Database not connected yet!`);
    return Database.connection;
  }

  /**
   * This method is called when attempted to connect to the database
   * @returns
   */
  static async connect() {
    // You can modify this function to connect to a different database...

    // Assign the database connection object
    Database.connection = await mongoose.connect(
      (await Env.get("DATABASE_CONNECTION_STRING", true)) ??
        "mongodb://localhost:27017/epic-api"
    );

    // Enable mongoose logs in development
    Database.connection.set("debug", !Env.is(EnvType.PRODUCTION));
  }

  /**
   * Disconnect the database
   * @returns
   */
  static async disconnect() {
    // You can modify this function to connect to a different database...

    // Disconnect the database
    await Database.get().disconnect();

    // Delete connection object
    delete Database.connection;
  }
}

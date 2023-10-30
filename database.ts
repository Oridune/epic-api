import { Env, EnvType } from "@Core/common/env.ts";
import { Mongo } from "mongo";

export class Database {
  /**
   * The database connection driver
   */
  static connection = Mongo;

  /**
   * Is database connected?
   * @returns
   */
  static isConnected() {
    return !!this.connection?.isConnected();
  }

  /**
   * This method is called when attempted to connect to the database
   */
  static async connect() {
    // You can modify this function to connect to a different database...

    // Resolve Connection String
    const ConnectionString =
      (await Env.get("DATABASE_CONNECTION_STRING", true)) ??
      "mongodb://localhost:27017/epic-api";

    // Assign the database connection object
    await this.connection.connect(ConnectionString);

    if (!Env.is(EnvType.PRODUCTION)) {
      // Enable mongoose logs in development
      this.connection.enableLogs = true;

      // Parse Connection String
      const ParsedConnectionString = new URL(ConnectionString);

      // Log database host
      console.info(
        "Database Host Connected:",
        ParsedConnectionString.hostname + ParsedConnectionString.pathname
      );
    }
  }

  /**
   * Disconnect the database
   */
  static disconnect() {
    // You can modify this function to connect to a different database...

    // Disconnect the database
    this.connection.disconnect();
  }

  /**
   * Helper method to execute database transactions
   * @param callback Execute your queries in this callback
   * @param session Optionally pass an external (parent) session
   * @returns
   */
  static transaction = Mongo.transaction;
}

import { Env, EnvType } from "@Core/common/env.ts";
import mongoose from "mongoose";

export class Database {
  /**
   * The database connection driver
   */
  static connection?: typeof mongoose;

  /**
   * Is database connected?
   * @returns
   */
  static isConnected() {
    return Database.connection?.connection.readyState === 1;
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
    Database.connection = await mongoose.connect(ConnectionString);

    if (!Env.is(EnvType.PRODUCTION)) {
      // Enable mongoose logs in development
      Database.connection.set("debug", true);

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
  static async disconnect() {
    // You can modify this function to connect to a different database...

    // Disconnect the database
    await Database.connection?.disconnect();

    // Delete connection object
    delete Database.connection;
  }

  /**
   * Helper method to execute database transactions
   * @param callback Execute your queries in this callback
   * @param session Optionally pass an external (parent) session
   * @returns
   */
  static async transaction<T extends Promise<unknown>>(
    callback: (session: mongoose.mongo.ClientSession) => T,
    session?: mongoose.mongo.ClientSession
  ) {
    const Session = session ?? (await mongoose.startSession());

    try {
      Session.startTransaction();

      const Results = await callback(Session);

      await Session.commitTransaction();

      return Results;
    } catch (error) {
      await Session.abortTransaction();
      throw error;
    } finally {
      await Session.endSession();
    }
  }
}

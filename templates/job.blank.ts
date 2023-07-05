import { Application } from "oak";

export default async (app: Application) => {
  // Write the logic to execute on app start (before server starts listening)...

  return async () => {
    // This code executes when the app receives "SIGINT" | "SIGTERM" | "SIGBREAK" signal.
    // Your optional cleanup code here...
  };
};

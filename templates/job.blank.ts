import { Application } from "oak";

export default {
  pre: (_app: Application) => {
    // Write the logic to execute on app start (before server starts listening)...
    // Pre job executes before the app is populated with routes

    return async () => {
      // This code executes when the app receives "SIGINT" | "SIGTERM" | "SIGBREAK" signal.
      // Your optional cleanup code here...
    };
  },

  post: (_app: Application) => {
    // Write the logic to execute on app start (before server starts listening)...
    // Post job executes after the app is populated with routes

    return async () => {
      // This code executes when the app receives "SIGINT" | "SIGTERM" | "SIGBREAK" signal.
      // Your optional cleanup code here...
    };
  },
};

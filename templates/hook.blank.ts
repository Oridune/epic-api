import {
  type IRequestContext,
  type RawResponse,
  type Response,
} from "@Core/common/mod.ts";
import { type RouterContext } from "oak";

export default {
  // This function is executed when a request is received from the client
  // and it passes all the middlewares reaching the actual request handler.
  pre: (
    scope: string,
    name: string,
    _ctx: IRequestContext<RouterContext<string>>,
  ) => {
    console.info(
      "We are going to execute the following scope.permission:",
      `${scope}.${name}`,
    );
  },

  // This function is executed after the request handler has been executed
  // and the server is about to send the response to the client.
  post: (
    scope: string,
    name: string,
    _detail: {
      ctx: IRequestContext<RouterContext<string>>;
      res: RawResponse | Response;
    },
  ) => {
    console.info(
      "We have executed the following scope.permission:",
      `${scope}.${name}`,
    );
  },
};

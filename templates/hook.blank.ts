import { type IRequestContext, type Response } from "@Core/common/mod.ts";
import { type RouterContext } from "oak";

export default {
  pre: (
    scope: string,
    name: string,
    _ctx: IRequestContext<RouterContext<string>>
  ) => {
    console.info(
      "We are going to execute the following scope.permission:",
      `${scope}.${name}`
    );
  },
  post: (
    scope: string,
    name: string,
    _detail: {
      ctx: IRequestContext<RouterContext<string>>;
      res: Response;
    }
  ) => {
    console.info(
      "We have executed the following scope.permission:",
      `${scope}.${name}`
    );
  },
};

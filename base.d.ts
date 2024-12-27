// deno-lint-ignore-file no-explicit-any no-unused-vars
import "ts-reset";
import "./plugins.d.ts";

import { I18next } from "@I18n";
import { Context } from "oak/context";
import { RouterContext } from "oak/router";
import { IRequestHandlerObjectExtendor } from "@Core/common/controller/base.ts";
import { IValidatorJSONSchema } from "validator";

declare module "oak/context" {
  export interface Context {
    /**
     * Access the I18next class constructor
     */
    i18n: typeof I18next;

    /**
     * Translates the string (key) using built-in i18n instance
     * @param key
     * @param opts
     */
    t(key: string | string[], ...opts: any[]): any;

    /**
     * Translates the string (key) into all available language variants using built-in i18n instance
     * @param key
     * @param opts
     */
    tvar(key: string | string[], ...opts: any[]): Record<string, any>;

    /**
     * Takes the snapshot of the heap memory and returns the file path
     * @returns
     */
    takeHeapSnapshot?: (filename?: string) => Promise<string>;
  }
}

type Shape = {
  headers?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
  query?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
  params?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
  body?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
  return?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
};

declare module "@Core/common/controller/base.ts" {
  interface IRequestHandlerObjectExtendor {
    idempotencyKey?:
      | string
      | ((
        ctx: IRequestContext<RouterContext<string>>,
      ) => string | undefined | Promise<string | undefined>);

    shape?: Shape | (() => Shape);

    postman?: {
      headers?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      query?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      params?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      body?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
    };
  }
}

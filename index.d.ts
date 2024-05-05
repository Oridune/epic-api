// deno-lint-ignore-file no-explicit-any no-empty-interface
import "ts-reset";
import "oak/context.ts";
import "@Core/common/controller/base.ts";
import { IValidatorJSONSchema } from "validator";

declare module "oak/context.ts" {
  export interface Context {
    t(key: string | string[], ...opts: any[]): any;
  }
}

declare module "@Core/common/controller/base.ts" {
  interface IRouterContextExtendor {
    // Override properties here
  }

  interface IRequestHandlerObjectExtendor {
    shape?: {
      headers?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      query?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      params?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      body?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      return?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
    };

    postman?: {
      headers?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      query?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      params?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
      body?: { data: Record<string, any>; schema?: IValidatorJSONSchema };
    };

    // Override properties here
  }
}

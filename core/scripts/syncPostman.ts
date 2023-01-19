import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { ApiServer } from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";

export type PostmanRequestMethods =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "COPY"
  | "HEAD"
  | "OPTIONS"
  | "LINK"
  | "UNLINK"
  | "PURGE"
  | "LOCK"
  | "UNLOCK"
  | "PROPFIND"
  | "VIEW";

export interface PostmanCollectionItemInterface {
  name: string;
  request?: {
    auth?: {
      type: "bearer" | "basic";
      bearer?: Array<{
        key: string;
        value: string;
        type: string;
      }>;
      basic?: Array<{
        key: string;
        value: string;
        type: string;
      }>;
    };
    method: PostmanRequestMethods;
    header?: Array<{
      key: string;
      value: string;
      type: string;
      disabled?: boolean;
    }>;
    body?: {
      mode: "urlencoded" | "formdata" | "raw";
      urlencoded?: Array<{
        key: string;
        value: string;
        description: string;
        type: string;
        disabled?: boolean;
      }>;
      formdata?: Array<{
        key: string;
        value: string;
        description: string;
        type: string;
        disabled?: boolean;
      }>;
      raw?: string;
    };
    url:
      | string
      | {
          raw: string;
          host: string[];
          path: string[];
          protocol?: "http";
          port?: "8080";
        };
  };
  response?: any[];
  item?: Array<PostmanCollectionItemInterface>;
}

export interface PostmanCollectionInterface {
  info: {
    _postman_id?: string;
    name: string;
    schema: string;
  };
  item: Array<PostmanCollectionItemInterface>;
}

export const syncPostman = async (options: {
  key: string;
  collectionId: string;
  name?: string;
}) => {
  // const Options = await e
  //   .object({
  //     key: e.string(),
  //     collectionId: e.string(),
  //     name: e.optional(e.string()),
  //   })
  //   .validate(options);

  // const Config = (
  //   await import(`file:///${join(Deno.cwd(), "deno.json")}`, {
  //     assert: { type: "json" },
  //   })
  // ).default;

  // // Create Empty Collection
  // const PostmanCollectionObject: PostmanCollectionInterface = {
  //   info: {
  //     name: Options.name ?? Config.name ?? Options.collectionId,
  //     schema:
  //       "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  //   },
  //   item: [],
  // };

  await new ApiServer(APIController).prepare((routes) => {
    console.log(routes);
    // const Requests: Record<string, PostmanCollectionItemInterface[]> = {};

    // for (const Route of routes) {
    //   const RoutePath = join("{{host}}", Route.endpoint)
    //     .replace(/\\/g, "/")
    //     .replace("?", "");
    //   const QueryParams = Object.entries<string>({});
    //   const Headers: any[] = [];
    //   const RawBody = "";

    //   Requests[Route.options.scope] = [
    //     ...(Requests[Route.options.scope] ?? []),
    //     {
    //       name: Route.options.name,
    //       request: {
    //         url:
    //           RoutePath +
    //           (QueryParams.length
    //             ? `?${QueryParams.map(
    //                 (param) => param[0] + "=" + param[1]
    //               ).join("&")}`
    //             : ""),
    //         method: Route.options.method.toUpperCase() as PostmanRequestMethods,
    //         header: Headers,
    //         body: {
    //           mode: "raw",
    //           raw: RawBody,
    //         },
    //       },
    //       response: [],
    //     },
    //   ];
    // }
  });
};

if (import.meta.main) {
  const { key, k, collectionId, c } = parse(Deno.args);

  syncPostman({
    key: key ?? k,
    collectionId: collectionId ?? c,
  });
}

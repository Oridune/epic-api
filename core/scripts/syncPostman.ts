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
  try {
    const Options = await e
      .object({
        key: e.string(),
        collectionId: e.string(),
        name: e.optional(e.string()),
      })
      .validate(options);

    const Config = (
      await import(`file:///${join(Deno.cwd(), "deno.json")}`, {
        assert: { type: "json" },
      })
    ).default;

    // Create Empty Collection
    const PostmanCollectionObject: PostmanCollectionInterface = {
      info: {
        name: Options.name ?? Config.name ?? Options.collectionId,
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
    };

    await new ApiServer(APIController).prepare((routes) => {
      const Requests: Record<string, PostmanCollectionItemInterface[]> = {};

      for (const Route of routes) {
        const Endpoint = join("{{host}}", Route.endpoint)
          .replace(/\\/g, "/")
          .replace("?", "");
        const QueryParams = Object.entries<string>({});
        const Headers: any[] = [];
        const RawBody = "";

        Requests[`${Route.group}/${Route.scope}`] = [
          ...(Requests[`${Route.group}/${Route.scope}`] ?? []),
          {
            name: Route.options.name,
            request: {
              url:
                Endpoint +
                (QueryParams.length
                  ? `?${QueryParams.map(
                      (param) => param[0] + "=" + param[1]
                    ).join("&")}`
                  : ""),
              method:
                Route.options.method.toUpperCase() as PostmanRequestMethods,
              header: Headers,
              body: {
                mode: "raw",
                raw: RawBody,
              },
            },
            response: [],
          },
        ];
      }

      const formatRequests = (
        names: [string, ...string[]],
        item: PostmanCollectionItemInterface[]
      ): { name: string; item: PostmanCollectionItemInterface[] } => {
        if (names.length === 1)
          return {
            name: names[0],
            item,
          };

        const Name = names.shift()!;

        return {
          name: Name,
          item: [formatRequests(names as [string, ...string[]], item)],
        };
      };

      for (const [Key, Items] of Object.entries(Requests)) {
        const Names = Key.split("/").filter(Boolean);

        if (!Names.length) PostmanCollectionObject.item = Items;
        else
          PostmanCollectionObject.item.push(
            formatRequests(Names as [string, ...string[]], Items)
          );
      }
    });

    await Deno.writeTextFile(
      `postman.json`,
      JSON.stringify(PostmanCollectionObject)
    );
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { key, k, collectionId, c } = parse(Deno.args);

  syncPostman({
    key: key ?? k,
    collectionId: collectionId ?? c,
  });
}

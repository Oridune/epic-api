// deno-lint-ignore-file no-explicit-any
import { parse } from "flags";
import { join } from "path";
import e from "validator";

import { Loader, Server } from "@Core/common/mod.ts";
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

export type PostmanHeader = Array<{
  key: string;
  value: string;
  type: string;
  disabled?: boolean;
}>;

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
    header?: PostmanHeader;
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
      options?: {
        raw?: {
          language?: "json";
        };
      };
    };
    url:
      | string
      | {
          raw: string;
          host: string[];
          path: string[];
          query?: Array<{ key: string; value: string }>;
          variable?: Array<{ key: string; value: string }>;
          protocol?: "http" | "https";
          port?: string;
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
  key?: string;
  collectionId?: string;
  name?: string;
  version?: string;
}) => {
  try {
    const Options = await e
      .object({
        key: e.optional(e.string()),
        collectionId: e.optional(e.string()),
        name: e.optional(e.string()),
        version: e.optional(e.string()).default("latest"),
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

    await new Server(APIController).prepare(async (routes) => {
      type NestedRequests = {
        [Key: string]: PostmanCollectionItemInterface[] | NestedRequests;
      };

      const RequestGroups: NestedRequests = {};

      for (const Route of routes) {
        const Groups = Route.group.split("/").filter(Boolean);

        const NormalizeRequest = (
          groups: string[],
          scope: string,
          request: PostmanCollectionItemInterface,
          requestGroups: NestedRequests
        ) => {
          if (!groups.length) {
            requestGroups[scope] = [
              ...((requestGroups[scope] as PostmanCollectionItemInterface[]) ??
                []),
              request,
            ];

            return requestGroups;
          }

          const Group = groups.shift()!;

          requestGroups[Group] = NormalizeRequest(
            groups,
            scope,
            request,
            (requestGroups[Group] as NestedRequests) ?? {}
          );

          return requestGroups;
        };

        const { object: RequestHandler } =
          (await Route.options.buildRequestHandler(Route, {
            version: Options.version,
          })) ?? {};

        if (typeof RequestHandler === "object") {
          const Host = "{{host}}";
          const Endpoint = join(Host, Route.endpoint)
            .replace(/\\/g, "/")
            .replace("?", "");
          const QueryParams = Object.entries<string>(
            RequestHandler.postman?.query ?? {}
          );

          NormalizeRequest(
            Groups,
            Route.scope,
            {
              name: Route.options.name,
              request: {
                url: {
                  raw:
                    Endpoint +
                    (QueryParams.length
                      ? `?${QueryParams.map(
                          (param) => param[0] + "=" + param[1]
                        ).join("&")}`
                      : ""),
                  host: [Host],
                  path: Route.endpoint.replace(/^\//, "").split("/"),
                  query: QueryParams.map(([key, value]) => ({ key, value })),
                  variable: Object.entries<string>(
                    RequestHandler.postman?.params ?? {}
                  ).map(([key, value]) => ({ key, value })),
                },
                method:
                  Route.options.method.toUpperCase() as PostmanRequestMethods,
                header: Object.entries<string>(
                  RequestHandler.postman?.headers ?? {}
                ).map(([key, value]) => ({ key, value, type: "text" })),
                body: RequestHandler.postman?.body
                  ? {
                      mode: "raw",
                      raw: JSON.stringify(
                        RequestHandler.postman.body,
                        undefined,
                        2
                      ),
                      options: {
                        raw: {
                          language: "json",
                        },
                      },
                    }
                  : undefined,
              },
              response: [],
            },
            RequestGroups
          );
        }
      }

      const PushRequests = (
        requestGroups: NestedRequests
      ): PostmanCollectionItemInterface[] => {
        const Requests = [];
        for (const [Key, Item] of Object.entries(requestGroups)) {
          if (Item instanceof Array)
            Requests.push({
              name: Key,
              item: Item,
            });
          else
            Requests.push({
              name: Key,
              item: PushRequests(Item),
            });
        }

        return Requests;
      };

      PostmanCollectionObject.item = PushRequests(RequestGroups);
    });

    await Deno.writeTextFile(
      `postman_collection-${Options.version}.json`,
      JSON.stringify(PostmanCollectionObject, undefined, 2)
    );

    if (Options.collectionId && Options.key) {
      const URI =
        "https://api.getpostman.com/collections/" + Options.collectionId;
      const Response = await fetch(URI, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": Options.key,
        },
        body: JSON.stringify({ collection: PostmanCollectionObject }),
      });

      console.log(
        "Postman Sync Response:",
        URI,
        Response.status,
        await Response.json()
      );
    }
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const { key, k, collectionId, c, name, n, version, v } = parse(Deno.args);

  await Loader.load({ includeTypes: ["controllers", "plugins"] });

  await syncPostman({
    key: key ?? k,
    collectionId: collectionId ?? c,
    name: name ?? n,
    version: version ?? v,
  });
}

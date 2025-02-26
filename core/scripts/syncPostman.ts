// deno-lint-ignore-file no-explicit-any
import { parseArgs as parse } from "flags/parse-args";
import { join } from "path";
import e, { ValidationException, Value } from "validator";

import { denoConfig, IRoute, Loader, Server } from "@Core/common/mod.ts";
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

export interface IPostmanCollection {
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
        raw?: string;
        host: string[];
        path: string[];
        query?: Array<{ key: string; value: string }>;
        variable?: Array<{ key: string; value: string }>;
        protocol?: "http" | "https";
        port?: string;
      };
  };
  response?: any[];
  item?: Array<IPostmanCollection>;
}

export interface PostmanCollectionInterface {
  info: {
    _postman_id?: string;
    name: string;
    description?: string;
    version: string;
    schema: string;
  };
  item: Array<IPostmanCollection>;
}

export const generatePostmanCollection = async (
  routes: IRoute[],
  data: {
    name: string;
    description: string;
    version: string;
  },
) => {
  // Create Empty Collection
  const PostmanCollectionObject: PostmanCollectionInterface = {
    info: {
      name: data.name,
      description: data.description,
      version: data.version,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [],
  };

  type NestedRequests = {
    [Key: string]: IPostmanCollection[] | NestedRequests;
  };

  const RequestGroups: NestedRequests = {};

  for (const Route of routes) {
    const Groups = Route.group.split("/").filter(Boolean);

    const normalizeRequest = (
      groups: string[],
      scope: string,
      request: IPostmanCollection,
      requestGroups: NestedRequests,
    ) => {
      if (!groups.length) {
        requestGroups[scope] = [
          ...((requestGroups[scope] as IPostmanCollection[]) ?? []),
          request,
        ];

        return requestGroups;
      }

      const Group = groups.shift()!;

      requestGroups[Group] = normalizeRequest(
        groups,
        scope,
        request,
        (requestGroups[Group] as NestedRequests) ?? {},
      );

      return requestGroups;
    };

    const { object: RequestHandler } =
      (await Route.options.buildRequestHandler(Route, {
        version: data.version,
      })) ?? {};

    if (typeof RequestHandler === "object") {
      const Host = "{{host}}";
      const Endpoint = join(Host, Route.endpoint)
        .replace(/\\/g, "/")
        .replace("?", "");

      const RawShape = RequestHandler.postman ?? RequestHandler.shape;

      const Shape = typeof RawShape === "function" ? RawShape() : RawShape;

      const Headers = Shape?.headers?.data?.toJSON?.();
      const HeadersSchema = Shape?.headers?.schema;

      const Query = Shape?.query?.data?.toJSON?.();
      const QuerySchema = Shape?.query?.schema;

      const Params = Shape?.params?.data?.toJSON?.();
      const ParamsSchema = Shape?.params?.schema;

      const Body = Shape?.body?.data;

      const QueryParams = Object.entries<string>(
        Query ?? {},
      );

      normalizeRequest(
        Groups,
        Route.scope,
        {
          name: Route.options.name,
          request: {
            url: {
              raw: Endpoint +
                (QueryParams.length
                  ? `?${
                    QueryParams.map(
                      ([key, value]) => key + "=" + value,
                    ).join("&")
                  }`
                  : ""),
              host: [Host],
              path: Route.endpoint
                .split("/")
                .filter(Boolean)
                .map((path) => path.replace(/\?$/, "")),
              query: QueryParams.map(([key, value]) => ({
                key,
                value,
                description: [
                  QuerySchema?.requiredProperties
                      ?.includes(
                        key,
                      )
                    ? undefined
                    : QuerySchema?.properties?.[key]
                      ?.description,
                ]
                  .filter(Boolean)
                  .join(" "),
              })),
              variable: Object.entries<string>(
                Params ?? {},
              ).map(([key, value]) => ({
                key,
                value,
                description: [
                  ParamsSchema?.requiredProperties
                      ?.includes(
                        key,
                      )
                    ? undefined
                    : ParamsSchema?.properties?.[key]
                      ?.description,
                ]
                  .filter(Boolean)
                  .join(" "),
              })),
            },
            method: Route.options.method
              .toUpperCase() as PostmanRequestMethods,
            header: Object.entries<string>(
              Headers ?? {},
            ).map(([key, value]) => ({
              key,
              value,
              type: "text",
              description: [
                HeadersSchema?.requiredProperties
                    ?.includes(
                      key,
                    )
                  ? undefined
                  : HeadersSchema?.properties?.[key]
                    ?.description,
              ]
                .filter(Boolean)
                .join(" "),
            })),
            body: Body
              ? {
                mode: "raw",
                raw: Value.stringify(
                  Body,
                  null,
                  2,
                ) as string,
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
        RequestGroups,
      );
    }
  }

  const pushRequests = (
    requestGroups: NestedRequests,
  ): IPostmanCollection[] =>
    Object.entries(requestGroups).map(([Key, Item]) => ({
      name: Key,
      item: Item instanceof Array ? Item : pushRequests(Item),
    }));

  PostmanCollectionObject.item = pushRequests(RequestGroups);

  return PostmanCollectionObject;
};

export const syncPostman = async (options: {
  key?: string;
  collectionId?: string;
  name?: string;
  description?: string;
  version?: string;
  group?: string;
}) => {
  try {
    const Options = await e
      .object({
        key: e.optional(e.string()),
        collectionId: e.optional(e.string()),
        name: e.optional(e.string()),
        description: e.optional(e.string()),
        version: e.optional(e.string()).default("latest"),
        group: e.optional(e.string()),
      })
      .validate(options);

    const Routes = await new Server(APIController).prepare((routes) => {
      if (Options.group) {
        return routes.filter((route) => {
          const group = route.options.group instanceof Array
            ? route.options.group
            : [route.options.group];

          return group.includes(Options.group);
        });
      }

      return routes;
    });

    const RoutesTableData: Array<{
      Type: string;
      Group?: string;
      Method: string;
      Permission: string;
      Endpoint: string;
    }> = [];

    Routes.forEach((Route) =>
      RoutesTableData.push({
        Type: "Endpoint",
        Group: Options.group,
        Method: Route.options.method.toUpperCase(),
        Permission: `${Route.scope}.${Route.options.name}`,
        Endpoint: Route.endpoint,
      })
    );

    // Log routes list
    if (RoutesTableData) console.table(RoutesTableData);

    const PostmanCollectionObject = await generatePostmanCollection(Routes, {
      name: Options.name ?? denoConfig.title ?? Options.collectionId,
      description: Options.description ?? denoConfig.description,
      version: Options.version,
    });

    await Deno.writeTextFile(
      `postman_collection-${Options.version}.json`,
      JSON.stringify(PostmanCollectionObject, undefined, 2),
    );

    if (Options.collectionId && Options.key) {
      const URI = "https://api.getpostman.com/collections/" +
        Options.collectionId;
      const Response = await fetch(URI, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": Options.key,
        },
        body: JSON.stringify({ collection: PostmanCollectionObject }),
      });

      console.info(
        "Postman Sync Response:",
        URI,
        Response.status,
        await Response.json(),
      );
    }

    return PostmanCollectionObject;
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  const {
    key,
    k,
    collectionId,
    c,
    name,
    d,
    description,
    n,
    version,
    v,
    group,
    g,
  } = parse(Deno.args);

  await Loader.load({ includeTypes: ["controllers", "plugins"] });

  await syncPostman({
    key: key ?? k,
    collectionId: collectionId ?? c,
    name: name ?? n,
    description: description ?? d,
    version: version ?? v,
    group: group ?? g,
  });

  Deno.exit();
}

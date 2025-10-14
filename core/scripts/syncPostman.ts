// deno-lint-ignore-file no-explicit-any
import { parseArgs as parse } from "flags/parse-args";
import { join } from "path";
import e, { ValidationException, Value } from "validator";
import { exists } from "dfs";

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

export type PostmanVariable = {
  key: string;
  value: string;
  description?: string;
  type?: string;
  disabled?: boolean;
};

export interface PostmanCollectionInterface {
  info: {
    _postman_id?: string;
    name: string;
    description?: string;
    version: string;
    schema: string;
  };
  item: Array<IPostmanCollection>;
  variable: Array<PostmanVariable>;
}

export interface IPostmanCollection {
  name: string;
  request?: {
    auth?: {
      type: "bearer" | "basic";
      bearer?: Array<PostmanVariable>;
      basic?: Array<PostmanVariable>;
    };
    method: PostmanRequestMethods;
    header?: Array<PostmanVariable>;
    body?: {
      mode: "urlencoded" | "formdata" | "raw";
      urlencoded?: Array<PostmanVariable>;
      formdata?: Array<PostmanVariable>;
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
        query?: Array<PostmanVariable>;
        variable?: Array<PostmanVariable>;
        protocol?: "http" | "https";
        port?: string;
      };
  };
  response?: Array<{
    name: string;
    originalRequest?: Partial<IPostmanCollection["request"]>;
    status: string;
    code: number;
    _postman_previewlanguage: string;
    header?: Array<PostmanVariable>;
    cookie?: any[];
    body?: string;
  }>;
  item?: Array<IPostmanCollection>;
}

export const generatePostmanCollection = async (
  routes: IRoute[],
  data?: {
    name?: string;
    description?: string;
    version?: string;
  },
  variables?: Record<string, string>,
) => {
  const Name = data?.name ?? "epic-api";
  const IntegrationDocPath = join(Deno.cwd(), "INTEGRATION.md");
  const Description = (await exists(IntegrationDocPath))
    ? await Deno.readTextFile(IntegrationDocPath)
    : data?.description;
  const Version = data?.version ?? "1.0.0";

  // Create Empty Collection
  const PostmanCollectionObject: PostmanCollectionInterface = {
    info: {
      name: Name,
      description: Description,
      version: Version,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [],
    variable: Object.entries(variables ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
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

    const normalizeParamValue = (value: any) => {
      const $ = `${value}`;

      if ($ === "[object Object]") return JSON.stringify(value);

      return $;
    };

    try {
      const { object: RequestHandler } =
        (await Route.options.buildRequestHandler(Route, {
          version: Version,
        })) ?? {};

      if (typeof RequestHandler === "object") {
        const Host = "{{host}}";
        const Endpoint = join(Host, Route.endpoint)
          .replace(/\\/g, "/")
          .replace("?", "");

        const RawShape = RequestHandler.shape;

        const Shape = typeof RawShape === "function" ? RawShape() : RawShape;

        const Headers = Shape?.headers?.data?.toJSON?.();
        const HeadersSchema = Shape?.headers?.schema;

        const Query = Shape?.query?.data?.toJSON?.();
        const QuerySchema = Shape?.query?.schema;

        const Params = Shape?.params?.data?.toJSON?.();
        const ParamsSchema = Shape?.params?.schema;

        const Body = Shape?.body?.data;
        const Return = Shape?.return?.data;

        const QueryParams = Object.entries<string>(
          Query ?? {},
        );

        const Request = {
          url: {
            raw: Endpoint +
              (QueryParams.length
                ? `?${
                  QueryParams.map(
                    ([key, value]) => key + "=" + normalizeParamValue(value),
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
              value: normalizeParamValue(value),
              description: QuerySchema?.properties?.[key]?.description,
            })),
            variable: Object.entries<string>(
              Params ?? {},
            ).map(([key, value]) => ({
              key,
              value: normalizeParamValue(value),
              description: ParamsSchema?.properties?.[key]?.description,
            })),
          },
          method: Route.options.method
            .toUpperCase() as PostmanRequestMethods,
          header: Object.entries<string>(
            Headers ?? {},
          ).map(([key, value]) => ({
            key,
            value: normalizeParamValue(value),
            type: "text",
            description: HeadersSchema?.properties?.[key]?.description,
          })),
          body: Body
            ? {
              mode: "raw" as const,
              raw: Value.stringify(
                Body,
                null,
                2,
              ) as string,
              options: {
                raw: {
                  language: "json" as const,
                },
              },
            }
            : undefined,
        };

        normalizeRequest(
          Groups,
          Route.scope,
          {
            name: Route.options.name,
            request: Request,
            response: (Return
              ? [{
                name: "Success Response",
                code: 200,
                status: "ok",
                _postman_previewlanguage: "json",
                originalRequest: {
                  method: Request.method,
                  url: Request.url,
                  body: Request.body,
                },
                body: Value.stringify(
                  Return,
                  null,
                  2,
                ),
              }]
              : undefined),
          },
          RequestGroups,
        );
      }
    } catch (cause) {
      throw new Error(
        `Postman generation failed on route ${Route.scope}.${Route.options.name}`,
        { cause },
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
  variables?: Record<string, string>;
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
        variables: e.optional(e.record(e.string())),
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
      description: (Options.description ?? denoConfig.description),
      version: Options.version,
    }, Options.variables);

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
    vars,
  } = parse(Deno.args);

  await Loader.load({ includeTypes: ["controllers", "plugins"] });

  const variables = vars
    ? Object.fromEntries(new URLSearchParams(vars))
    : undefined;

  await syncPostman({
    key: key ?? k,
    collectionId: collectionId ?? c,
    name: name ?? n,
    description: description ?? d,
    version: version ?? v,
    group: group ?? g,
    variables,
  });

  Deno.exit();
}

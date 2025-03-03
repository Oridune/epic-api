// deno-lint-ignore-file no-explicit-any
import { parse } from "flags";
import { dirname, join } from "path";
import { expandGlob } from "dfs";
import e, { IValidatorJSONSchema, ValidationException } from "validator";

import { denoConfig, IRoute, Loader, Server } from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";
import { exec } from "@Core/scripts/lib/run.ts";
import { ejsRender } from "@Core/scripts/lib/ejsRender.ts";

export interface IPackageJSON {
  name?: string;
  version?: string;
  private?: boolean;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;

  [K: string]: unknown;
}

export const createPackageJSON = (opts?: IPackageJSON): IPackageJSON => ({
  name: "epic-api-sdk",
  version: "0.0.0",
  private: true,
  main: "./dist/index.js",
  scripts: {
    build: "tsc",
  },
  author: denoConfig.title,
  license: "MIT",
  homepage: denoConfig.homepage,
  ...opts,
});

export const createTsConfigJSON = () => ({
  compilerOptions: {
    target: "ESNEXT",
    module: "commonjs",
    declaration: true,
    declarationMap: false,
    sourceMap: false,
    outDir: "./dist/",
    rootDir: "./src/",
    strict: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
  },
  include: ["./src/"],
  exclude: ["./test/"],
});

export const writeJSONFile = (path: string, data: any) =>
  Deno.writeTextFile(
    path,
    JSON.stringify(
      data,
      undefined,
      2,
    ),
  );

export const serializeApiRoutes = (routes: IRoute[]) =>
  routes.reduce((routeGroups, route) => {
    const scopeKey = route.scope;
    const key = route.options.name;

    if (!routeGroups[scopeKey]) routeGroups[scopeKey] = {};
    if (!routeGroups[scopeKey][key]) routeGroups[scopeKey][key] = [];

    routeGroups[scopeKey][key].push(route);

    return routeGroups;
  }, {} as Record<string, Record<string, IRoute[]>>);

export const schemaToTsType = (schema?: IValidatorJSONSchema, content = "") => {
  if (!schema) return { optional: true, content: "{}" };

  if (schema.description) content += "/*" + schema.description + "*/";

  if (schema.type === "object") {
    content += "{\n";

    for (const [Key, Schema] of Object.entries(schema.properties ?? {})) {
      const { optional, content: c } = schemaToTsType(Schema);

      content += `\t\t${Key}${optional ? "?" : ""}: ${c};\n`;
    }

    content += "}";

    if (schema.additionalProperties) {
      const { optional, content: c } = schemaToTsType(
        schema.additionalProperties,
      );

      content += ` & { [K: string]${optional ? "?" : ""}: ${c} }\n`;
    }

    return { optional: !schema.requiredProperties?.length, content };
  }

  if (schema.type === "array") {
    const ItemType = schemaToTsType(schema.items);

    content = `Array<${ItemType.content}${
      ItemType.optional ? " | undefined" : ""
    }>`;

    return { optional: schema.optional ?? false, content };
  }

  if (schema.type === "or") {
    content = (schema.anyOf ?? []).map((schema) =>
      schemaToTsType(schema).content
    ).join(" | ");

    return { optional: schema.optional ?? false, content };
  }

  if (schema.type === "and") {
    content = (schema.anyOf ?? []).map((schema) =>
      schemaToTsType(schema).content
    ).join(" & ");

    return { optional: schema.optional ?? false, content };
  }

  if (schema.type === "enum") {
    return {
      optional: schema.optional ?? false,
      content: schema.choices instanceof Array
        ? `"${schema.choices?.join(`" | "`)}"`
        : "string",
    };
  }

  return {
    optional: schema.optional ?? false,
    content: schema.type,
  };
};

export const syncSDKExtensions = async (opts: {
  extensionsDir: string;
  sdkDir: string;
}) => {
  const Files = expandGlob("**/**/*", {
    root: opts.extensionsDir,
    globstar: true,
  });

  const SDKExtensionsDir = join(opts.sdkDir, "src/extensions");

  for await (const File of Files) {
    if (
      !File.isDirectory &&
      // Do not copy these files and folders
      [
        /^(\\|\/)?(\.git)(\\|\/)?/,
        /^(\\|\/)?(\.vscode)(\\|\/)?/,
        /^(\\|\/)?(\.husky)(\\|\/)?/,
        /(\\|\/)?(node_modules)(\\|\/)?/,
      ].reduce(
        (allow, expect) =>
          allow &&
          !expect.test(File.path.replace(opts.extensionsDir, "")),
        true,
      )
    ) {
      const SourcePath = File.path;
      const TargetPath = SourcePath.replace(
        opts.extensionsDir,
        SDKExtensionsDir,
      );

      const TargetDirectory = dirname(TargetPath);

      await Deno.mkdir(TargetDirectory, { recursive: true }).catch(
        () => {
          // Do nothing...
        },
      );

      const sourceContent = await Deno.readTextFile(SourcePath);

      await Deno.writeTextFile(
        TargetPath,
        sourceContent.replace(
          /from\s*"epic-api-sdk"/g,
          'from "../../../"',
        ),
      );
    }
  }

  const Extensions: Array<{
    name: string;
    package: IPackageJSON;
    main: string;
  }> = [];

  for await (const Entry of Deno.readDir(SDKExtensionsDir)) {
    if (Entry.isDirectory) {
      Extensions.push({
        name: Entry.name,
        package: JSON.parse(
          await Deno.readTextFile(
            join(SDKExtensionsDir, Entry.name, "package.json"),
          ),
        ) as IPackageJSON,
        main: `./extensions/${Entry.name}/src/index`,
      });
    }
  }

  return Extensions;
};

export const generateSDK = async (options: {
  version?: string;
}) => {
  try {
    const Options = await e
      .object({
        version: e.optional(e.string()).default("latest"),
      })
      .validate(options);

    const SDKName = `sdk@${Options.version}`;
    const SDKDir = join(Deno.cwd(), `public/${SDKName}/`);
    const SDKSrc = join(SDKDir, "src");
    const SDKPublicDir = join(SDKDir, "www");
    const ExtensionsDir = join(Deno.cwd(), "sdk-extensions");

    await Deno.mkdir(join(SDKSrc, "modules"), { recursive: true }).catch(() => {
      // Do nothing...
    });

    const Extensions = await syncSDKExtensions({
      extensionsDir: ExtensionsDir,
      sdkDir: SDKDir,
    });

    const PackageJSON = createPackageJSON({
      version: Options.version,
      dependencies: Extensions.map(($) => $.package.dependencies).filter(
        Boolean,
      ).reduce<Record<string, string>>(($, deps) => ({ ...$, ...deps }), {}),
    });

    const TsConfigJSON = createTsConfigJSON();

    await Promise.all([
      writeJSONFile(
        join(SDKDir, "package.json"),
        PackageJSON,
      ),
      writeJSONFile(
        join(SDKDir, "tsconfig.json"),
        TsConfigJSON,
      ),
    ]);

    await exec("npm i axios", { cwd: SDKDir });
    await exec("npm i -D typescript", { cwd: SDKDir });

    const Routes = await new Server(APIController).prepare((routes) => {
      const RoutesTableData: Array<{
        Type: string;
        Method: string;
        Permission: string;
        Endpoint: string;
      }> = [];

      routes.forEach((Route) =>
        RoutesTableData.push({
          Type: "Endpoint",
          Method: Route.options.method.toUpperCase(),
          Permission: `${Route.scope}.${Route.options.name}`,
          Endpoint: Route.endpoint,
        })
      );

      // Log routes list
      if (RoutesTableData) console.table(RoutesTableData);

      return routes;
    });

    const EJSContext = {
      scopeGroups: serializeApiRoutes(Routes),
      getTypeStr: async (
        route: IRoute,
        shapeType: "query" | "params" | "body" | "return",
      ) => {
        const { object: RequestHandler } =
          (await route.options.buildRequestHandler(route, {
            version: Options.version,
          })) ?? {};

        const RawShape = RequestHandler?.shape ?? RequestHandler?.postman ?? {};

        const Shape = typeof RawShape === "function" ? RawShape() : RawShape;

        const Schema = Shape[shapeType as "query"]?.schema;

        return schemaToTsType(Schema);
      },
      generateModule: async (
        scope: string,
        routeGroups: Record<string, IRoute[]>,
      ) => {
        const ModulePath = `./modules/${scope}.ts`;

        await Deno.writeTextFile(
          join(SDKSrc, ModulePath),
          await ejsRender(
            await Deno.readTextFile(
              "core/scripts/templates/sdk/module.ts.ejs",
            ),
            {
              ...EJSContext,
              scope,
              routeGroups,
            },
          ),
        );

        return ModulePath.replace(/\.ts$/, "");
      },
      extensions: Extensions,
    };

    await Promise.all([
      Deno.writeTextFile(
        join(SDKSrc, "types.ts"),
        await ejsRender(
          await Deno.readTextFile(
            "core/scripts/templates/sdk/types.ts.ejs",
          ),
          EJSContext,
        ),
      ),

      Deno.writeTextFile(
        join(SDKSrc, "index.ts"),
        await ejsRender(
          await Deno.readTextFile(
            "core/scripts/templates/sdk/index.ts.ejs",
          ),
          EJSContext,
        ),
      ),
    ]);

    await exec("npm run build", { cwd: SDKDir });
    await exec("npm pack", { cwd: SDKDir });

    await Deno.mkdir(SDKPublicDir, { recursive: true }).catch(() => {
      // Do nothing...
    });

    const CurrentTarbalPath = join(
      SDKDir,
      `${PackageJSON.name}-${PackageJSON.version}.tgz`,
    );
    const NewTarbalPath = join(SDKPublicDir, "package.tgz");

    await Deno.rename(CurrentTarbalPath, NewTarbalPath);

    await Loader.getSequence("public")?.set((_) => _.add(SDKName));

    console.info(
      `${PackageJSON.name}@${Options.version} has been generated!`,
    );
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  const { version, v } = parse(Deno.args);

  await Loader.load({ includeTypes: ["controllers", "plugins", "public"] });

  await generateSDK({
    version: version ?? v,
  });

  Deno.exit();
}

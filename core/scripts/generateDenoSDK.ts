import { parseArgs as parse } from "flags/parse-args";
import { APIController } from "@Core/controller.ts";
import { dirname, join } from "path";
import { exists, expandGlob } from "dfs";
import e, { ValidationException } from "validator";
import { ejsRender } from "@Core/scripts/lib/ejsRender.ts";
import { writeJSONFile } from "@Core/scripts/lib/utility.ts";
import { IRoute, Loader, Server } from "@Core/common/mod.ts";
import {
  createPackageJSON,
  schemaToTsType,
  serializeApiRoutes,
} from "./generateSDK.ts";
import { exec } from "@Core/scripts/lib/run.ts";

export interface IDenoJSON {
  name?: string;
  version?: string;
  exports?: Record<string, string>;
  imports?: Record<string, string>;

  [K: string]: unknown;
}

export const createDenoJSON = (opts?: IDenoJSON): IDenoJSON => ({
  name: "epic-api-sdk",
  version: "0.0.0",
  ...opts,
});

export const syncSDKExtensions = async (opts: {
  sdkDir: string;
}) => {
  if (!await exists(opts.sdkDir)) return [];

  const ExtensionsSourceFolder = "sdk-extensions";
  const SDKExtensionsDir = join(opts.sdkDir, "extensions");

  const pluginsDirNames = Loader.getSequence("plugins")?.list() ?? [];

  const ExtensionsDirs = [
    join(Deno.cwd(), ExtensionsSourceFolder),
    ...pluginsDirNames.map((dir) =>
      join(Deno.cwd(), "plugins", dir, ExtensionsSourceFolder)
    ),
  ];

  return (await Promise.all(ExtensionsDirs.map(async (extensionDir) => {
    const Files = expandGlob("**/**/*", {
      root: extensionDir,
      globstar: true,
    });

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
            !expect.test(File.path.replace(extensionDir, "")),
          true,
        )
      ) {
        const SourcePath = File.path;
        const TargetPath = SourcePath.replace(
          extensionDir,
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
          sourceContent,
        );
      }
    }

    if (!await exists(SDKExtensionsDir)) return [];

    const Extensions: Array<{
      name: string;
      denoConfig: IDenoJSON;
      entry: string;
    }> = [];

    for await (const Entry of Deno.readDir(SDKExtensionsDir)) {
      if (Entry.isDirectory) {
        const denoConfigPath = join(SDKExtensionsDir, Entry.name, "deno.json");

        const denoConfig = JSON.parse(
          await Deno.readTextFile(denoConfigPath),
        ) as IDenoJSON;

        const imports = denoConfig.imports ??= {};

        imports["epic-api-sdk"] = "../../index.ts";

        await Deno.writeTextFile(denoConfigPath, JSON.stringify(denoConfig));

        Extensions.push({
          name: Entry.name,
          denoConfig: denoConfig,
          entry: `./extensions/${Entry.name}/entry`,
        });
      }
    }

    return Extensions;
  }))).flat();
};

export const generateNpmModule = async (opts: {
  sdkDir: string;
}) => {
  const script = "./scripts/buildNpm.ts";
  const scriptPath = join(opts.sdkDir, script);
  const modulePath = join(opts.sdkDir, "npm");

  await Deno.mkdir(join(opts.sdkDir, "scripts"), { recursive: true }).catch(
    () => {
      // Do nothing...
    },
  );

  const packageJSON = createPackageJSON();

  await Deno.writeTextFile(
    scriptPath,
    `
    import { build, emptyDir } from "jsr:@deno/dnt";

    await emptyDir("./npm");

    await build({
      entryPoints: ["./index.ts"],
      outDir: "./npm",
      shims: {
        // see JS docs for overview and more options
        deno: true,
      },
      package: ${JSON.stringify(packageJSON)},
    });
    `,
  );

  await exec(`deno run -A ${script}`, { cwd: opts.sdkDir });
  await exec("npm pack", { cwd: modulePath });

  const CurrentTarbalPath = join(
    modulePath,
    `${packageJSON.name}-${packageJSON.version}.tgz`,
  );
  const NewTarbalPath = join(opts.sdkDir, "package.tgz");

  await Deno.rename(CurrentTarbalPath, NewTarbalPath);
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
    const SDKDir = join(Deno.cwd(), `public/${SDKName}/www`);

    await Deno.mkdir(join(SDKDir, "modules"), { recursive: true }).catch(
      () => {
        // Do nothing...
      },
    );

    const Extensions = await syncSDKExtensions({
      sdkDir: SDKDir,
    });

    const DenoJSON = createDenoJSON({
      ...(Options.version === "latest" ? {} : { version: Options.version }),
      exports: {
        ".": "./index.ts",
        "./types": "./types.ts",
      },
      imports: {
        "axios": "npm:axios",
      },
    });

    await writeJSONFile(
      join(SDKDir, "deno.json"),
      DenoJSON,
    );

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
      apiVersion: Options.version,
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
          join(SDKDir, ModulePath),
          await ejsRender(
            await Deno.readTextFile(
              "core/scripts/templates/deno-sdk/module.ts.ejs",
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
        join(SDKDir, "types.ts"),
        await ejsRender(
          await Deno.readTextFile(
            "core/scripts/templates/deno-sdk/types.ts.ejs",
          ),
          EJSContext,
        ),
      ),

      Deno.writeTextFile(
        join(SDKDir, "index.ts"),
        await ejsRender(
          await Deno.readTextFile(
            "core/scripts/templates/deno-sdk/index.ts.ejs",
          ),
          EJSContext,
        ),
      ),
    ]);

    await Loader.getSequence("public")?.set((_) => _.add(SDKName));

    await generateNpmModule({
      sdkDir: SDKDir,
    });

    console.info(
      `${SDKName} has been generated!`,
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

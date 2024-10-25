// deno-lint-ignore-file no-explicit-any
import { dirname, join } from "path";
import { existsSync, expandGlob } from "dfs";
import { IValidatorJSONSchema, ValidationException } from "validator";

import { Mongo } from "mongo";

import { denoConfig, EnvType, Loader } from "@Core/common/mod.ts";
import { printStream } from "@Core/scripts/lib/utility.ts";
import { plural } from "pluralize";

export interface IEntityField {
  id: string;
  types: string[];
  isPrimary?: boolean;
  isArray?: boolean;
  isAnyOf?: boolean;
  isAllOf?: boolean;
  description?: string;
  cast?: boolean;
  optional?: boolean;
  minLength?: number;
  maxLength?: number;
  minAmount?: number;
  maxAmount?: number;
  choices?: string[];
  patterns?: string[];
  startsAt?: Date | number;
  endsAt?: Date | number;
  expected?: any;
}

export interface IEntity {
  id: string;
  fields: Array<IEntityField>;
}

export type TReferenceType = "embed" | "relation";
export type TRelationType = "one" | "many";
export type TEdgePosition = "left" | "right";

export interface IReference {
  type: TReferenceType;
  relationType?: TRelationType;
  source: string;
  target: string;
  sourceField?: string;
  targetField?: string;
  sourcePosition?: TEdgePosition;
  targetPosition?: TEdgePosition;
}

export interface IERDData {
  entities: Array<IEntity>;
  references: Array<IReference>;
}

export const normalizeEntityProps = (
  props: Exclude<IValidatorJSONSchema["properties"], undefined>,
  parentKey?: string,
): IEntityField[] => {
  return Object.entries(props ?? {})
    .map(
      ([
        id,
        {
          type,
          description,
          properties,
          items,
          anyOf,
          allOf,
          cast,
          optional,
          minLength,
          maxLength,
          minAmount,
          maxAmount,
          patterns,
        },
      ]) => {
        const resolvedId = [parentKey, id].filter(Boolean).join(".");
        const resolvedType = type instanceof Array ? type[0] : type;

        const resolvedTypes = items?.type instanceof Array
          ? items.type
          : [items?.type ?? resolvedType];

        const types = Array.from(
          new Set(
            anyOf?.map((prop) => prop.type).flat() ??
              allOf?.map((prop) => prop.type).flat() ??
              resolvedTypes,
          ),
        );

        return [
          {
            id: resolvedId,
            types,
            isPrimary: (id === "_id" && resolvedType === "ObjectId") ||
              undefined,
            isArray: resolvedType === "array" || undefined,
            isAnyOf: resolvedType === "or" || undefined,
            isAllOf: resolvedType === "and" || undefined,
            description,
            cast,
            optional,
            minLength,
            maxLength,
            minAmount,
            maxAmount,
            patterns,
          },
          ...(type === "object"
            ? normalizeEntityProps(properties ?? {}, resolvedId)
            : type === "array" && items?.type === "object"
            ? normalizeEntityProps(
              items.properties ?? {},
              resolvedId + "[]",
            )
            : ["and", "or"].includes(type as string)
            ? (anyOf ?? allOf ?? [])
              .map((types) =>
                normalizeEntityProps(
                  types.properties ?? {},
                  resolvedId,
                )
              )
              .flat()
            : []),
        ];
      },
    )
    .flat();
};

export const translateFieldToPossibleEntity = (id: string) => {
  switch (id) {
    case "createdBy":
    case "from":
    case "to":
    case "sender":
    case "receiver":
      return "user";

    default:
      return id;
  }
};

export const generateERDData = async () => {
  const data: IERDData = {
    entities: [],
    references: [],
  };

  await Loader.loadModules("models");

  const ExistingEntities = new Set<string>();

  for (const [_, model] of Mongo.models) {
    const schema = model.getSchema().toJSON().schema;

    data.entities.push({
      id: model.name,
      fields: normalizeEntityProps(schema.properties ?? {}),
    });

    ExistingEntities.add(model.name);
  }

  for (const Entity of data.entities) {
    let FieldIndex = 0;

    for (const Field of Entity.fields) {
      const target = plural(translateFieldToPossibleEntity(Field.id));

      if (
        Field.id !== "_id" &&
        Field.types.includes("ObjectId") &&
        ExistingEntities.has(target)
      ) {
        data.references.push({
          type: "relation",
          source: Entity.id,
          target,
          relationType: Field.isArray ? "many" : "one",
          sourceField: Field.id,
          targetField: "_id",
          sourcePosition: FieldIndex % 2 ? "right" : "left",
          targetPosition: FieldIndex % 2 ? "left" : "right",
        });
      }

      Entity.fields.sort((a, b) =>
        a.id === "_id" ? -1 : b.id === "_id" ? 1 : 0
      );

      FieldIndex++;
    }
  }

  return data;
};

export const generateERD = async () => {
  try {
    const RepoName = "Oridune/epic-api-erd";
    const GitRepoUrl = new URL(RepoName, "https://github.com");
    const TempPath = join(Deno.cwd(), "_temp", RepoName);
    const UIDir = join(TempPath, "www");
    const Pull = existsSync(UIDir);
    const UIID = "erd";

    const Command = new Deno.Command("git", {
      args: Pull ? ["pull", "origin", denoConfig.template, "--progress"] : [
        "clone",
        "--single-branch",
        "--branch",
        denoConfig.template,
        GitRepoUrl.toString(),
        TempPath,
        "--progress",
      ],
      cwd: Pull ? TempPath : undefined,
      stdout: "piped",
      stderr: "piped",
    });

    const Process = Command.spawn();

    const [Out] = await Promise.all([
      printStream(Process.stdout),
      printStream(Process.stderr),
    ]);

    const Status = await Process.status;

    cloneUI: if (Status.success) {
      if (Out.find((_) => _.includes("Already up to date"))) {
        break cloneUI;
      }

      // Create Files
      for (
        const Glob of ["www/**/*"].map((pattern) =>
          expandGlob(pattern, {
            root: TempPath,
            globstar: true,
          })
        )
      ) {
        for await (const Entry of Glob) {
          // Do not include .git folder
          if (
            !Entry.isDirectory &&
            !/^(\\|\/)?(\.git)(\\|\/)?/.test(
              Entry.path.replace(TempPath, ""),
            )
          ) {
            const SourcePath = Entry.path;
            const PublicDir = join(Deno.cwd(), "public");
            const TargetPath = SourcePath.replace(
              TempPath,
              join(PublicDir, UIID),
            );

            // Do not replace any file that is not included in this list.
            if (
              existsSync(TargetPath) && [
                /^(\\|\/)?(data.json)/,
              ].reduce(
                (continues, expect) =>
                  continues &&
                  !expect.test(
                    Entry.path.replace(TempPath, ""),
                  ),
                true,
              )
            ) continue;

            const TargetDirectory = dirname(TargetPath);

            await Deno.mkdir(TargetDirectory, { recursive: true })
              .catch(() => {
                // Do nothing...
              });

            await Deno.copyFile(SourcePath, TargetPath);
          }
        }
      }

      await Loader.getSequence("public")?.add(UIID, undefined, {
        env: EnvType.DEVELOPMENT,
      });
    } else throw new Error("We were unable to generate erd!");

    await Deno.writeTextFile(
      join(Deno.cwd(), "public", UIID, "www/data.json"),
      JSON.stringify(await generateERDData()),
    );
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

    throw error;
  }
};

if (import.meta.main) {
  await Loader.load({ includeTypes: ["models", "plugins", "public"] });

  await generateERD();

  Deno.exit();
}

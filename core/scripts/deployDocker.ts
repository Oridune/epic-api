import { parse } from "flags";
import { join } from "path";
import { existsSync } from "dfs";
import { denoConfig } from "@Core/common/mod.ts";
import e from "validator";
import { exec } from "./lib/run.ts";

import { Confirm, Input, Select } from "cliffy:prompt";

export enum DeployEnv {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
}

export enum DeploymentType {
  PATCH = "patch",
  MINOR = "minor",
  MAJOR = "major",
}

export type TDeploymentVersion = {
  major: number;
  minor: number;
  patch: number;
};

export type TDeploymentLogs = {
  [Env in DeployEnv]?: {
    dockerOrganization?: string;
    dockerImage?: string;
    version?: TDeploymentVersion;
  };
};

const LogsPath = join(Deno.cwd(), "deployment-logs.json");

export const getDeploymentLogs = async (): Promise<
  TDeploymentLogs
> => {
  if (!existsSync(LogsPath)) return {};

  return (
    await import(`file:///${LogsPath}`, {
      with: { type: "json" },
    })
  ).default;
};

export const saveDeploymentLogs = async (logs: TDeploymentLogs) => {
  await Deno.writeTextFile(LogsPath, JSON.stringify(logs, null, 2));
};

export const logExecOut = async (
  info: string,
  process: ReturnType<typeof exec>,
) => {
  console.info(info);
  await process.then(
    ({ stderr, stdout }) => {
      if (stderr) console.error(stderr);

      console.log(stdout);
    },
  );
};

export const deployDocker = async (options: {
  environment?: DeployEnv;
  deployment?: DeploymentType;
  version?: TDeploymentVersion;
  versionTag?: string;
  prompt?: boolean;
  noConfirm?: boolean;
}) => {
  try {
    const InitialOptions = await e
      .object(
        {
          environment: e.optional(e.in(Object.values(DeployEnv)))
            .default(async (ctx) =>
              ctx.parent!.input.prompt
                ? ((await Select.prompt({
                  message: "Select deployment environment",
                  options: Object.values(DeployEnv),
                })) as DeployEnv)
                : DeployEnv.DEVELOPMENT
            ),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    const AllLogs = await getDeploymentLogs();
    const EnvLogs = AllLogs[InitialOptions.environment];

    let DockerOrg = "unknown";
    let DockerImage = "unknown";

    if (options.prompt && !EnvLogs) {
      if (
        !(await Confirm.prompt({
          message: `Do you want to initialize a new deployment?`,
        }))
      ) throw new Error(`No previous deployment logs found!`);

      DockerOrg = await Input.prompt({
        message: "Provide your docker hub id",
      });

      DockerImage = await Input.prompt({
        message: "Provide your docker image id",
      });
    }

    const VersionSchema = e.object({
      major: e.optional(e.number({ cast: true })).default((
        ctx,
      ) =>
        (EnvLogs?.version?.major ?? 0) +
        (ctx.parent.parent.output.deployment ===
            DeploymentType.MAJOR
          ? 1
          : 0)
      ),
      minor: e.optional(e.number({ cast: true })).default((
        ctx,
      ) =>
        ctx.parent.parent.output.deployment ===
            DeploymentType.MAJOR
          ? 0
          : (EnvLogs?.version?.minor ?? 0) +
            (ctx.parent.parent.output.deployment ===
                DeploymentType.MINOR
              ? 1
              : 0)
      ),
      patch: e.optional(e.number({ cast: true })).default((
        ctx,
      ) =>
        ctx.parent.parent.output.deployment !==
            DeploymentType.PATCH
          ? 0
          : (EnvLogs?.version?.patch ?? 0) + 1
      ),
    });

    const Options = await e
      .object(
        {
          environment: e.value(InitialOptions.environment),
          deployment: e.optional(e.in(Object.values(DeploymentType)))
            .default(async (ctx) =>
              ctx.parent!.input.prompt &&
                typeof options.version !== "object"
                ? ((await Select.prompt({
                  message: "Select deployment type",
                  options: Object.values(DeploymentType),
                })) as DeploymentType)
                : undefined
            ),
          version: options.prompt
            ? e.optional(VersionSchema).default({}, {
              validate: true,
            })
            : VersionSchema,
          versionTag: e.optional(e.string()),
          noConfirm: e.optional(e.boolean()),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    if (
      options.prompt &&
      !Options.noConfirm &&
      !(await Confirm.prompt({
        message:
          `Make sure you have docker installed on this machine! Do you want to continue deployment?`,
      }))
    ) return;

    const TargetLogs = AllLogs[InitialOptions.environment] ??= {};
    DockerOrg = TargetLogs.dockerOrganization ??= DockerOrg;
    DockerImage = TargetLogs.dockerImage ??= DockerImage;
    TargetLogs.version = Options.version;

    const DefaultImageTag = `${denoConfig.id}-image`;
    const ImageVersion = [
      Options.version.major,
      Options.version.minor,
      Options.version.patch,
    ].join(".");
    const ImageTag = [
      `${DockerOrg}/${DockerImage}-${Options.environment}:v${ImageVersion}`,
      Options.versionTag,
    ].filter(Boolean).join("-");

    // Build docker image
    await logExecOut(
      "Building docker image...",
      exec(`docker build -t ${DefaultImageTag} .`),
    );

    // Tag default image
    await logExecOut(
      "Tagging docker image...",
      exec(`docker tag ${DefaultImageTag} ${ImageTag}`),
    );

    // Push docker image to docker hub
    await logExecOut(
      "Pushing docker image...",
      exec(`docker push ${ImageTag}`),
    );

    await saveDeploymentLogs(AllLogs);

    if (
      options.prompt &&
      !Options.noConfirm &&
      !(await Confirm.prompt({
        message:
          `Make sure you have terraform installed on this machine! Do you want to continue deployment?`,
      }))
    ) return;

    // Push docker image to docker hub
    await logExecOut(
      "Starting terraform deployment...",
      exec(
        `terraform apply -var="container_image=${ImageTag}" -auto-approve`,
        { cwd: join(Deno.cwd(), "terraform", Options.environment) },
      ),
    );

    console.info("Your deployment was successful!");
  } catch (error) {
    console.error(error, error.issues);
    throw error;
  }
};

if (import.meta.main) {
  const {
    environment,
    e,
    deployment,
    d,
    patch,
    minor,
    major,
    versionTag,
    t,
    y,
  } = parse(
    Deno.args,
  );

  await deployDocker({
    environment: environment ?? e,
    deployment: deployment ?? d,
    version: (patch ?? minor ?? major)
      ? {
        patch,
        minor,
        major,
      }
      : undefined,
    versionTag: versionTag ?? t,
    prompt: true,
    noConfirm: y,
  });

  Deno.exit();
}

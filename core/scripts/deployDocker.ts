import { parseArgs as parse } from "flags/parse-args";
import { join } from "path";
import { existsSync } from "dfs";
import { denoConfig } from "@Core/common/mod.ts";
import e, { ValidationException } from "validator";
import { exec, spawn } from "./lib/run.ts";

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
  dockerOrg?: string;
  prompt?: boolean;
  noConfirm?: boolean;
  skipBuild?: boolean;
  skipPublish?: boolean;
  skipApply?: boolean;
  skipCommit?: boolean;
  deployDirty?: boolean;
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
        message: "Provide your docker hub organization/id",
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
          dockerOrg: e.optional(e.string()),
          noConfirm: e.optional(e.boolean()),
          skipBuild: e.optional(e.boolean()),
          skipPublish: e.optional(e.boolean()),
          skipApply: e.optional(e.boolean()),
          skipCommit: e.optional(e.boolean()),
          deployDirty: e.optional(e.boolean()),
        },
        { allowUnexpectedProps: true },
      )
      .validate(options);

    const TargetLogs = AllLogs[InitialOptions.environment] ??= {};
    DockerOrg = Options.dockerOrg ??
      (TargetLogs.dockerOrganization ??= DockerOrg);
    DockerImage = TargetLogs.dockerImage ??= DockerImage;
    TargetLogs.version = Options.version;

    const DefaultImageTag = `${denoConfig.id}-image`;
    const ImageName = `${DockerImage}-${Options.environment}`;
    const ImageVersion = [
      [
        Options.version.major,
        Options.version.minor,
        Options.version.patch,
      ].join("."),
      Options.versionTag,
    ].filter(Boolean).join("-");
    const ImageTag = `${DockerOrg}/${ImageName}:v${ImageVersion}`;

    let built = false;
    let applied = false;

    if (!Options.skipBuild) {
      if (options.prompt) {
        if (!Options.deployDirty) {
          const [stdout] = await spawn(`git status --porcelain`);

          if (stdout.length) {
            throw new Error(
              `Git staged files detected! Please commit any changes before the deployment!`,
            );
          }
        }

        if (
          !Options.noConfirm &&
          !(await Confirm.prompt({
            message:
              `Make sure you have docker installed on this machine! Do you want to continue deployment?`,
          }))
        ) return;
      }

      // Build docker image
      const [_, dockerBuildErr] = await spawn(
        `docker build -t ${DefaultImageTag} .`,
      );

      if (/^ERROR/.test(dockerBuildErr[0] ?? "")) {
        throw new Error(`Docker build has been failed!`);
      }

      // Tag default image
      await spawn(
        `docker tag ${DefaultImageTag} ${ImageTag}`,
      );

      if (!Options.skipPublish) {
        // Push docker image to docker hub
        const [dockerPushOut, dockerPushErr] = await spawn(
          `docker push ${ImageTag}`,
        );

        if (dockerPushOut.length && dockerPushErr.length) {
          throw new Error(`Docker push has been failed!`);
        }
      }

      await saveDeploymentLogs(AllLogs);

      built = true;
    }

    if (!Options.skipApply) {
      if (
        options.prompt &&
        !Options.noConfirm &&
        !(await Confirm.prompt({
          message:
            `Make sure you have terraform installed on this machine! Do you want to continue deployment?`,
        }))
      ) return;

      const TerraformDir = join(Deno.cwd(), "terraform", Options.environment);
      const TerraformInit = join(TerraformDir, ".terraform.lock.hcl");
      const TerraformBin = join(TerraformDir, ".terraform");

      if (!existsSync(TerraformInit) || !existsSync(TerraformBin)) {
        await spawn("terraform init", { cwd: TerraformDir });
      }

      // Push docker image to docker hub
      await spawn(
        `terraform apply -var default_container_image=${DefaultImageTag} -var container_image=${ImageTag} -var image_name=${ImageName} -var image_version=${ImageVersion} -auto-approve`,
        { cwd: TerraformDir },
      );

      applied = true;
    }

    // git commit
    if (!Options.skipCommit && (built || applied)) {
      await spawn(
        `git add .`,
      );

      await spawn(
        `git commit -m "Automated deployment: ${ImageTag}"`,
      );
    }

    console.info("Your deployment was complete!");
  } catch (error) {
    if (error instanceof ValidationException) {
      console.error(error, error.issues);
    }

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
    dockerOrg,
    t,
    y,
    skipBuild,
    skipPublish,
    skipApply,
    skipCommit,
    deployDirty,
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
    dockerOrg,
    prompt: true,
    noConfirm: y,
    skipBuild,
    skipPublish,
    skipApply,
    skipCommit,
    deployDirty,
  });

  Deno.exit();
}

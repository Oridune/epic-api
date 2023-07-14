import Semver from "https://esm.sh/u-semver@0.7.1";

export const semverResolve = <T extends string>(
  version: string,
  versionRange: string[],
  preRelease?: boolean
) => Semver.resolve(version, versionRange, preRelease) as T | undefined;

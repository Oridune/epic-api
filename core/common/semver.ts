import Semver from "u-semver";

export const semverResolve = <T extends string>(
  version: string,
  versionRange: string[],
  preRelease?: boolean
) => Semver.resolve(version, versionRange, preRelease) as T | undefined;

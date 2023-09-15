import Semver from "u-semver";

/**
 * Resolves a version according to Semver versioning rules
 * @param version Version to be resolved
 * @param versionRange Available versions list
 * @param preRelease Allow resolving to a pre-release version
 * @returns
 */
export const semverResolve = <T extends string>(
  version: string,
  versionRange: string[],
  preRelease?: boolean
) => Semver.resolve(version, versionRange, preRelease) as T | undefined;

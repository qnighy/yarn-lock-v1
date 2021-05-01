// https://github.com/yarnpkg/yarn/blob/v1.22.10/src/lockfile/index.js

export type V1LockfileObject = Record<string, V1LockManifest>;

export type V1LockManifest = {
  name?: string;
  version: string;
  resolved?: string;
  integrity?: string;
  registry?: "npm" | "yarn";
  uid?: string;
  permissions?: Record<string, boolean>;
  optionalDependencies?: V1Dependencies;
  dependencies?: V1Dependencies;
};

export type V1Dependencies = Record<string, string>;

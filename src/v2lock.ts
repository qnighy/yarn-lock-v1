import {
  assertObject,
  assertNumber,
  assertString,
  assertBoolean,
} from "./validation";

export type V2LockfileObject<M = V2LockManifest> = {
  __metadata: V2Metadata;
  [key: string]: M | V2Metadata;
};

export type V2Metadata = {
  version: number;
  cacheKey: number;
};

export type V2LockManifest = {
  version: string;
  name?: string;
  resolution?: string;
  dependencies?: V2Dependencies;
  dependenciesMeta?: V2DependenciesMeta;
};

export type V2Dependencies = Record<string, string>;

export type V2DependenciesMeta = Record<string, V2DependencyMeta>;

export type V2DependencyMeta = {
  optional?: boolean;
};

export function assertLockfileShallow(
  obj: unknown
): asserts obj is V2LockfileObject<unknown> {
  assertObject(obj, "lockfile");
  assertMetadata(obj.__metadata, "__metadata");
}

export function assertMetadata(
  obj: unknown,
  path: string
): asserts obj is V2Metadata {
  assertObject(obj, path);
  assertNumber(obj.version, `${path}.version`);
  assertNumber(obj.cacheKey, `${path}.version`);
}

export function assertManifest(obj: unknown): asserts obj is V2LockManifest {
  assertObject(obj, "package");
  assertString(obj.version, "package.version");
  if (obj.name !== undefined) assertString(obj.name, "package.name");
  if (obj.resolution !== undefined)
    assertString(obj.resolution, "package.resolution");
  if (obj.dependencies !== undefined)
    assertDependencies(obj.dependencies, "package.dependencies");
  if (obj.dependenciesMeta !== undefined)
    assertDependenciesMeta(obj.dependenciesMeta, "package.dependenciesMeta");
}

function assertDependencies(
  obj: unknown,
  path: string
): asserts obj is V2Dependencies {
  assertObject(obj, path);
  for (const [k, v] of Object.entries(obj)) {
    assertString(v, `${path}[${JSON.stringify(k)}]`);
  }
}

function assertDependenciesMeta(
  obj: unknown,
  path: string
): asserts obj is V2DependenciesMeta {
  assertObject(obj, path);
  for (const [k, v] of Object.entries(obj)) {
    assertDependencyMeta(v, `${path}[${JSON.stringify(k)}]`);
  }
}

function assertDependencyMeta(
  obj: unknown,
  path: string
): asserts obj is V2DependencyMeta {
  assertObject(obj, path);
  if (obj.optional !== undefined)
    assertBoolean(obj.optional, `${path}.optional`);
}

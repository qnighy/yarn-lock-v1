import { assertObject, assertString } from "./validation";

export type PackageInfo = {
  dist?: PackageDist;
};

export type PackageDist = {
  shasum?: string;
  integrity?: string;
};

export function assertPackageInfo(obj: unknown): asserts obj is PackageInfo {
  assertObject(obj, "package");
  if (obj.dist !== undefined) assertPackageDist(obj.dist);
}

function assertPackageDist(obj: unknown): asserts obj is PackageDist {
  assertObject(obj, "package.dist");
  if (obj.shasum !== undefined) assertString(obj.shasum, "package.dist.shasum");
  if (obj.integrity !== undefined)
    assertString(obj.integrity, "package.dist.integrity");
}

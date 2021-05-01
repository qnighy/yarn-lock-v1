import yaml from "js-yaml";
import https from "https";
import nodeFetch, { Headers, Response } from "node-fetch";

import { stringify } from "./stringify";
import { V1LockfileObject, V1LockManifest } from "./v1lock";
import { assertLockfileShallow, assertManifest, V2Dependencies, V2DependenciesMeta } from "./v2lock";
import { assertPackageInfo } from "./package-info";

interface Options {
  yarnrc?: YarnRc;
  fetch?: Fetcher;
}
export type Fetcher = (
  url: string,
  init?: { headers?: Headers }
) => Promise<Response>;

export interface YarnRc {
  npmAlwaysAuth?: boolean;
  npmAuthIdent?: string;
  npmAuthToken?: string;
  npmRegistries?: Record<string, RegistryConfig>;
}

export interface RegistryConfig {
  npmAlwaysAuth?: boolean;
  npmAuthIdent?: string;
  npmAuthToken?: string;
}

export async function convertLockfile(
  lockV2: string,
  options: Options = {}
): Promise<string> {
  let cleanup: () => void = () => {
    /* do nothing */
  };
  let fetch: Fetcher;
  if (options.fetch) {
    fetch = options.fetch;
  } else {
    const agent = new https.Agent({ keepAlive: true, maxTotalSockets: 10 });
    nodeFetch.isRedirect;
    fetch = (url, init = {}) => nodeFetch(url, { ...init, agent });
    cleanup = () => {
      agent.destroy();
    };
  }
  const result = await convertLockfileInner(lockV2, fetch, options);
  cleanup();
  return result;
}

async function convertLockfileInner(
  lockV2: string,
  fetch: Fetcher,
  options: Options = {}
): Promise<string> {
  const { yarnrc = {} } = options;
  const lockV2Obj: unknown = yaml.load(lockV2);
  const lockV1Obj: V1LockfileObject = {};

  assertLockfileShallow(lockV2Obj);

  const clausePromises = Object.entries(lockV2Obj).map(
    async ([packageKey, packageData]) => {
      if (packageKey === "__metadata") return;
      if (/@(?:patch|workspace):/.test(packageKey)) return;

      await convertEntry(lockV1Obj, packageKey, packageData, yarnrc, fetch);
    }
  );

  await Promise.all(clausePromises);

  return "# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.\n" +
    "# yarn lockfile v1\n" +
    "\n" +
    "\n" +
    stringify(lockV1Obj);
}

async function convertEntry(lockV1: V1LockfileObject, keyV2: string, manifestV2: unknown, yarnrc: YarnRc, fetch: Fetcher): Promise<void> {
  const manifestV1 = await convertManifest(manifestV2, yarnrc, fetch);
  
  for (const k of keyV2.split(", ")) {
    lockV1[k.replace("@npm:", "@")] = manifestV1;
  }
}

async function convertManifest(manifestV2: unknown, yarnrc: YarnRc, fetch: Fetcher): Promise<V1LockManifest> {
  assertManifest(manifestV2);
  const manifest: V1LockManifest = {
    version: manifestV2.version,
  };
  convertDependencies(manifestV2.dependencies, manifestV2.dependenciesMeta, manifest);
  if (manifestV2.resolution) await convertResolution(manifestV2.resolution, manifest, yarnrc, fetch);
  return manifest;
}

function convertDependencies(
  dependencies: V2Dependencies = {},
  dependenciesMeta: V2DependenciesMeta = {},
  manifestV1: V1LockManifest,
) {
  const isOptional = (pkg: string) =>
    Boolean(
      Object.prototype.hasOwnProperty.call(dependenciesMeta, pkg) &&
        dependenciesMeta[pkg]?.optional
    );

  for (const [depKey, depValue] of Object.entries(dependencies)) {
    const depListType = isOptional(depKey) ? "optionalDependencies" : "dependencies";
    const depList = (manifestV1[depListType] ||= {});
    depList[depKey] = String(depValue);
  }
}

async function convertResolution(
  resolutionV2: string,
  manifestV1: V1LockManifest,
  yarnrc: YarnRc,
  fetch: Fetcher
): Promise<void> {
  const [packageName, packageResolution] = resolutionV2.split(/(?!^@)@/, 2);
  const packageBaseName = packageName.split("/").reverse()[0];
  const [protocol, protocolValue] = packageResolution.split(":", 2);
  switch (protocol) {
    case "npm": {
      const version = protocolValue;
      let anchor = "";
      try {
        const packageInfo = await requestRegistry(
          `https://registry.yarnpkg.com/${packageName}/${version}`,
          yarnrc,
          fetch
        );
        assertPackageInfo(packageInfo);
        if (packageInfo.dist?.shasum) anchor = `#${packageInfo.dist.shasum}`;
        manifestV1.integrity = packageInfo.dist?.integrity;
        if (!manifestV1.integrity && packageInfo.dist?.shasum) {
          const bytes = Array.from(
            packageInfo.dist.shasum.matchAll(/[0-9a-f]{2}/gi)
          ).map(([text]) => parseInt(text, 16));
          manifestV1.integrity = `sha1-${Buffer.from(bytes).toString("base64")}`;
        }
      } catch (e) {
        console.warn(`Error reading ${packageName}/${version}`, e);
      }
      manifestV1.resolved = `https://registry.yarnpkg.com/${packageName}/-/${packageBaseName}-${version}.tgz${anchor}`;
      break;
    }
    default:
      throw new Error(`unknown package protocol: ${JSON.stringify(protocol)}`);
  }
}

async function requestRegistry(
  url: string,
  yarnrc: YarnRc,
  fetch: Fetcher
): Promise<unknown> {
  let registryConfig: RegistryConfig = yarnrc;
  const { npmRegistries = {} } = yarnrc;
  for (const [regMatcher, regConfig] of Object.entries(npmRegistries)) {
    if (!regMatcher.startsWith("//")) continue;
    if (
      url.startsWith(`https:${regMatcher}`) ||
      url.startsWith(`http:${regMatcher}`)
    ) {
      registryConfig = regConfig;
      break;
    }
  }
  // TODO: replace env vars
  const { npmAlwaysAuth, npmAuthIdent, npmAuthToken } = registryConfig;
  const hasAuth = Boolean(npmAuthIdent || npmAuthToken);
  if (!npmAlwaysAuth || !hasAuth) {
    const resp = await fetch(url);
    if (resp.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await resp.json();
    } else if (!hasAuth || resp.status !== 401) {
      throw new Error(`Got ${resp.status} from ${resp.url}`);
    }
  }
  if (npmAuthIdent) {
    const resp = await fetch(url, {
      headers: new Headers({
        Authorization: `Basic ${Buffer.from(evalEnv(npmAuthIdent)).toString(
          "base64"
        )}`,
      }),
    });
    if (!resp.ok) {
      throw new Error(`Got ${resp.status} from ${resp.url}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await resp.json();
  } else {
    const resp = await fetch(url, {
      headers: new Headers({
        Authorization: `Bearer ${evalEnv(npmAuthToken ?? "")}`,
      }),
    });
    if (!resp.ok) {
      throw new Error(`Got ${resp.status} from ${resp.url}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await resp.json();
  }
}

function evalEnv(s: string): string {
  return s.replaceAll(/\$\{([\w_][\w\d_]*)(:?-[^}]*)?\}/g, (...args) => {
    const [_match, name, fallback, _offset, _string] = args as [
      string,
      string,
      string | undefined,
      number,
      string
    ];
    const value = Object.prototype.hasOwnProperty.call(process.env, name)
      ? process.env[name]
      : undefined;
    if (value && (value !== "" || !fallback || !fallback.startsWith(":-")))
      return value;
    if (!fallback) {
      throw new Error(`${name} is not defined`);
    } else if (fallback.startsWith(":-")) {
      return fallback.substring(2);
    } else {
      return fallback.substring(1);
    }
  });
}

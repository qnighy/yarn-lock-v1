import yaml from "js-yaml";
import https from "https";
import nodeFetch, { Headers, Response } from "node-fetch";

interface Options {
  yarnrc?: YarnRc;
  fetch?: Fetcher;
}
export type Fetcher = (url: string, init?: { headers?: Headers }) => Promise<Response>;

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

export async function convertLockfile(lockV2: string, options: Options = {}): Promise<string> {
  let cleanup: () => void = () => {};
  let fetch: Fetcher;
  if (options.fetch) {
    fetch = options.fetch;
  } else {
    const agent = new https.Agent({ keepAlive: true, maxTotalSockets: 10 });
    nodeFetch.isRedirect
    fetch = (url, init = {}) => nodeFetch(url, { ...init, agent });
    cleanup = () => { agent.destroy() };
  }
  const result = await convertLockfileInner(lockV2, fetch, options);
  cleanup();
  return result;
}

async function convertLockfileInner(lockV2: string, fetch: Fetcher, options: Options = {}): Promise<string> {
  const { yarnrc = {} } = options;
  const lockV2Obj = yaml.load(lockV2);

  let lockV1 = "";
  lockV1 += "# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.\n"
  lockV1 += "# yarn lockfile v1\n"
  lockV1 += "\n";

  const clausePromises = Object.entries(lockV2Obj as object).map(async ([packageKey, packageData]) => {
    let clause = "";
    if (packageKey === "__metadata") return clause;
    if (/@(?:patch|workspace):/.test(packageKey)) return clause;

    clause += "\n";
    clause += `${convertKey(packageKey)}:\n`;
    if (typeof packageData.version === "string") {
      clause += `  version ${JSON.stringify(packageData.version)}\n`;
    }
    if (typeof packageData.resolution === "string") {
      clause += await convertResolution(packageData.resolution, yarnrc, fetch);
    }
    clause += convertDependencies(packageData.dependencies, packageData.dependenciesMeta);
    // console.log(packageKey);
    return clause;
  });

  lockV1 += (await Promise.all(clausePromises)).join('');

  return lockV1;
}

function convertDependencies(dependencies_: unknown, dependenciesMeta_: unknown): string {
  let dependencies: object = {};
  if (typeof dependencies_ === "object" && dependencies_ !== null) dependencies = dependencies_;
  let dependenciesMeta: object = {};
  if (typeof dependenciesMeta_ === "object" && dependenciesMeta_ !== null) dependenciesMeta = dependenciesMeta_;

  const isOptional = (pkg: string) => Boolean(Object.prototype.hasOwnProperty.call(dependenciesMeta, pkg) && (dependenciesMeta as any)[pkg]?.optional);

  let output = "";

  let hasDependenciesHeader = false;
  for (const [depKey, depValue] of Object.entries(dependencies)) {
    if (isOptional(depKey)) {
      continue;
    }
    if (!hasDependenciesHeader) {
      hasDependenciesHeader = true;
      output += '  dependencies:\n';
    }
    output += `    ${escapeIfNeeded(depKey)} ${JSON.stringify(String(depValue))}\n`;
  }
  let hasOptionalDependenciesHeader = false;
  for (const [depKey, depValue] of Object.entries(dependencies)) {
    if (!isOptional(depKey)) {
      continue;
    }
    if (!hasOptionalDependenciesHeader) {
      hasOptionalDependenciesHeader = true;
      output += '  optionalDependencies:\n';
    }
    output += `    ${escapeIfNeeded(depKey)} ${JSON.stringify(String(depValue))}\n`;
  }
  return output;
}

async function convertResolution(resolutionV2: string, yarnrc: YarnRc, fetch: Fetcher): Promise<string> {
  const [packageName, packageResolution] = resolutionV2.split(/(?!^@)@/, 2);
  const packageBaseName = packageName.split('/').reverse()[0];
  const [protocol, protocolValue] = packageResolution.split(':', 2);
  switch (protocol) {
    case 'npm': {
      const version = protocolValue;
      let anchor = "";
      let integrity: string | null = null;
      try {
        const packageInfo = await requestRegistry(
          `https://registry.yarnpkg.com/${packageName}/${version}`,
          yarnrc,
          fetch
        );
        anchor = `#${packageInfo.dist.shasum}`;
        integrity = packageInfo.dist.integrity;
        if (!integrity && packageInfo.dist.shasum) {
          const bytes = Array.from((packageInfo.dist.shasum as string).matchAll(/[0-9a-f]{2}/ig)).map(([text]) => parseInt(text, 16));
          integrity = `sha1-${Buffer.from(bytes).toString('base64')}`;
        }
      } catch(e) {
        console.warn(`Error reading ${packageName}/${version}`, e);
      }
      let resolution = "";
      const resolvedUrl = `https://registry.yarnpkg.com/${packageName}/-/${packageBaseName}-${version}.tgz${anchor}`;
      resolution += `  resolved ${JSON.stringify(resolvedUrl)}\n`;
      if (integrity) {
        resolution += `  integrity ${integrity}\n`;
      }
      return resolution;
    }
    default:
      throw new Error(`unknown package protocol: ${JSON.stringify(protocol)}`);
  }
}

async function requestRegistry(url: string, yarnrc: YarnRc, fetch: Fetcher): Promise<any> {
  let registryConfig: RegistryConfig = yarnrc;
  const { npmRegistries = {} } = yarnrc;
  for (const [regMatcher, regConfig] of Object.entries(npmRegistries)) {
    if (!regMatcher.startsWith("//")) continue;
    if (url.startsWith(`https:${regMatcher}`) || url.startsWith(`http:${regMatcher}`)) {
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
      return await resp.json();
    } else if (!hasAuth || resp.status !== 401) {
      throw new Error(`Got ${resp.status} from ${resp.url}`);
    }
  }
  if (npmAuthIdent) {
    const resp = await fetch(url, {
      headers: new Headers({
        'Authorization': `Basic ${Buffer.from(evalEnv(npmAuthIdent)).toString('base64')}`
      }),
    });
    if (!resp.ok) {
      throw new Error(`Got ${resp.status} from ${resp.url}`);
    }
    return await resp.json();
  } else {
    const resp = await fetch(url, {
      headers: new Headers({
        'Authorization': `Bearer ${evalEnv(npmAuthToken ?? '')}`
      }),
    });
    if (!resp.ok) {
      throw new Error(`Got ${resp.status} from ${resp.url}`);
    }
    return await resp.json();
  }
}

function evalEnv(s: string): string {
  return s.replaceAll(/\$\{([\w_][\w\d_]*)(:?-[^}]*)?\}/g, (...args) => {
    const [_match, name, fallback, _offset, _string] = args as [string, string, string | undefined, number, string];
    const value = Object.prototype.hasOwnProperty.call(process.env, name) ? process.env[name] : undefined;
    if (value && (value !== "" || !fallback || !fallback.startsWith(':-'))) return value;
    if (!fallback) {
      throw new Error(`${name} is not defined`);
    } else if (fallback.startsWith(':-')) {
      return fallback.substring(2);
    } else {
      return fallback.substring(1);
    }
  });
}

function convertKey(keyV2: string): string {
  return keyV2.split(", ").map((constraintV2) => {
    const constraintV1 = constraintV2.replace("@npm:", "@");
    return escapeIfNeeded(constraintV1);
  }).join(", ");
}

function escapeIfNeeded(val: string): string {
  return /^@| /.test(val) ? JSON.stringify(val) : val;
}

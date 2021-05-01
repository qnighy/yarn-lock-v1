/* eslint-disable @typescript-eslint/ban-types */
// Based on https://github.com/yarnpkg/yarn/blob/v1.22.10/src/lockfile/stringify.js

const INDENT = "  ";

export function stringify(obj: object): string {
  const lines: string[] = [];
  stringifyPush(obj, "", true, lines);
  return lines.join("");
}

function stringifyPush(
  obj: object,
  indent: string,
  topLevel: boolean,
  lines: string[]
) {
  const identicalKeys = new Map<object, string[]>();
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v !== null) {
      const keys = identicalKeys.get(v);
      if (keys) keys.push(k);
      else identicalKeys.set(v, [k]);
    }
  }

  let isFirst = true;
  const addSeparator = () => {
    if (!isFirst && topLevel) {
      lines.push("\n");
    }
    isFirst = false;
  };
  for (const [primaryKey, v] of sortEntriesWithPriority<unknown>(
    Object.entries(obj)
  )) {
    switch (typeof v) {
      case "boolean":
      case "number":
      case "string":
        addSeparator();
        lines.push(`${indent}${wrapKey(primaryKey)} ${wrapKey(v)}\n`);
        continue;
      case "function":
      case "object":
        if (v === null) continue;
        break;
      case "undefined":
        continue;
      default:
        // symbol or bigint
        throw new Error(`Cannot stringify ${typeof v}`);
    }

    const keys = identicalKeys.get(v);
    if (keys === undefined) continue;
    identicalKeys.delete(v);

    const joinedKeys = keys.sort().map(wrapKey).join(", ");
    addSeparator();
    lines.push(`${indent}${joinedKeys}:\n`);
    stringifyPush(v, indent + INDENT, false, lines);
  }
}

function shouldWrapKey(s: string): boolean {
  return /^true|^false|^[0-9]|[:\s\n\\",[\]]/.test(s) || !/^[a-zA-Z]/.test(s);
}

export function wrapKey(s: string | boolean | number): string {
  if (typeof s === "boolean" || typeof s === "number" || shouldWrapKey(s)) {
    return JSON.stringify(s);
  } else {
    return s;
  }
}

const priorities: Readonly<Record<string, number>> = {
  name: 1,
  version: 2,
  uid: 3,
  resolved: 4,
  integrity: 5,
  registry: 6,
  dependencies: 7,
};

export function sortEntriesWithPriority<T>(keys: [string, T][]): [string, T][] {
  return keys.sort(([ak], [bk]) => cmpWithPriority(ak, bk));
}

export function sortWithPriority(keys: string[]): string[] {
  return keys.sort(cmpWithPriority);
}

function cmpWithPriority(a: string, b: string): number {
  const ap = Object.prototype.hasOwnProperty.call(priorities, a)
    ? priorities[a]
    : 100;
  const bp = Object.prototype.hasOwnProperty.call(priorities, b)
    ? priorities[b]
    : 100;
  if (ap !== bp) return ap - bp;
  return cmpAlpha(a, b);
}

// UCS-2 (UTF-16) lexcographical ordering
function cmpAlpha(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; ++i) {
    const ai = a.charCodeAt(i);
    const bi = b.charCodeAt(i);
    if (ai !== bi) return ai - bi;
  }
  return a.length - b.length;
}

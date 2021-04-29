import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import nodeFetch, { FetchError, Response } from "node-fetch";
import { URL } from "url";
import path from "path";

import { convertLockfile, Fetcher } from "./convert";

const cacheRoot = path.resolve(__dirname, "./__fixtures__/caches");
const mockedFetch: Fetcher = async (url) => {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new FetchError(`request to ${url} failed`, "");
  }
  const parts = [parsedUrl.hostname, ...parsedUrl.pathname.split("/")]
    .map((part) => encodeURIComponent(part))
    .filter((part) => !/^(?:|\..*)$/.test(part));
  const cachePath = path.resolve(cacheRoot, ...parts);
  if (fs.existsSync(cachePath)) {
    return new Response(await fs.promises.readFile(cachePath));
  }
  if (process.env.UPDATE_CACHE !== "true") {
    throw new FetchError(`request to ${url} failed`, "");
  }
  const resp = await nodeFetch(url);
  if (!resp.ok) {
    throw new FetchError(`request to ${url} failed`, "");
  }
  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  const body = await resp.arrayBuffer();
  await fs.promises.writeFile(cachePath, new Uint8Array(body));
  return new Response(body);
};

describe("convertLockfile", () => {
  it("convers normal dependencies", async () => {
    const lockV2 = fs.readFileSync(
      path.resolve(__dirname, "./__fixtures__/yarn-lock1.txt"),
      "utf-8"
    );
    const lockV1 = await convertLockfile(lockV2, { fetch: mockedFetch });
    expect(lockV1).toMatchSnapshot("yarn-lock1");
  });
});

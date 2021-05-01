import { describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import { setupRecorder } from "nock-record";
import nodeFetch, { Headers, Response } from "node-fetch";

import { convertLockfile, Fetcher } from "./convert";

const record = setupRecorder({
  mode: process.env.NOCK_BACK_MODE === "record" ? "record" : "lockdown",
});

describe("convertLockfile", () => {
  it("convers normal dependencies", async () => {
    const { completeRecording, assertScopesFinished } = await record(
      "yarn-lock1"
    );

    const lockV2 = fs.readFileSync(
      path.resolve(__dirname, "./__fixtures__/yarn-lock1.txt"),
      "utf-8"
    );
    const lockV1 = await convertLockfile(lockV2);
    expect(lockV1).toMatchSnapshot();

    completeRecording();
    assertScopesFinished();
  });

  it("converts confluent dependencies", async () => {
    const { completeRecording, assertScopesFinished } = await record(
      "yarn-lock2"
    );

    const lockV2 = fs.readFileSync(
      path.resolve(__dirname, "./__fixtures__/yarn-lock2.txt"),
      "utf-8"
    );
    const lockV1 = await convertLockfile(lockV2);
    expect(lockV1).toMatchSnapshot();

    completeRecording();
    assertScopesFinished();
  });

  it("falls back to offline inference if fetch failed", async () => {
    const fetch: Fetcher = async (url) => {
      if (/is-regex\/1\.1\.2/.test(url)) {
        return new Response("", { status: 503, url });
      } else {
        return nodeFetch(url);
      }
    };
    const interaction = {
      warn: jest.fn<string, []>(),
    };
    const { completeRecording, assertScopesFinished } = await record(
      "yarn-lock1-offline"
    );

    const lockV2 = fs.readFileSync(
      path.resolve(__dirname, "./__fixtures__/yarn-lock1.txt"),
      "utf-8"
    );
    const lockV1 = await convertLockfile(lockV2, { fetch, interaction });
    expect(lockV1).toMatchSnapshot();

    completeRecording();
    assertScopesFinished();

    expect(interaction.warn.mock.calls).toEqual([
      [
        "Error reading is-regex/1.1.2: Got 503 from https://registry.yarnpkg.com/is-regex/1.1.2",
      ],
    ]);
  });

  it("sends Bearer token when requested", async () => {
    const token = "8dd79e01-d0a4-446b-b261-d6d6408227d2";
    const fetch: Fetcher = async (url, init) => {
      const { headers = new Headers() } = init ?? {};
      if (/is-regex\/1\.1\.2/.test(url)) {
        if (headers.get("Authorization") === `Bearer ${token}`) {
          return nodeFetch(url);
        } else {
          return new Response("", {
            status: headers.get("Authorization") ? 403 : 401,
            url,
          });
        }
      } else {
        return nodeFetch(url);
      }
    };
    const interaction = {
      warn: jest.fn<string, []>(),
    };
    const { completeRecording, assertScopesFinished } = await record(
      "yarn-lock1"
    );

    const lockV2 = fs.readFileSync(
      path.resolve(__dirname, "./__fixtures__/yarn-lock1.txt"),
      "utf-8"
    );
    const lockV1 = await convertLockfile(lockV2, {
      fetch,
      interaction,
      yarnrc: { npmAuthToken: token },
    });
    expect(lockV1).toMatchSnapshot();

    completeRecording();
    assertScopesFinished();

    expect(interaction.warn.mock.calls).toEqual([]);
  });
});

import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { setupRecorder } from "nock-record";

import { convertLockfile } from "./convert";

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
    expect(lockV1).toMatchSnapshot("yarn-lock1");

    completeRecording();
    assertScopesFinished();
  });
});

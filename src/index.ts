import fs from "fs";
import process from "process";
import { convertLockfile } from "./convert";

(async () => {
  const lockV2 = await fs.promises.readFile('yarn.lock', 'utf-8');
  const lockV1 = await convertLockfile(lockV2);
  await fs.promises.writeFile('yarn.lock.v1', lockV1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

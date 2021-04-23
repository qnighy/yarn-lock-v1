import fs from "fs";
import process from "process";
import yargs from "yargs";
import { convertLockfile } from "./convert";

const { f: inputPath, o: outputPath } = yargs
  .scriptName('yarn-lock-v1')
  .option('f', {
    alias: 'file',
    describe: 'input yarn.lock file (v2)',
    default: 'yarn.lock',
    type: 'string',
  })
  .option('o', {
    alias: 'output',
    describe: 'output yarn.lock file (v1)',
    default: 'yarn.lock',
    type: 'string',
  })
  .strict()
  .help()
  .argv;

(async () => {
  const lockV2 = await fs.promises.readFile(inputPath, 'utf-8');
  const lockV1 = await convertLockfile(lockV2);
  if (inputPath === outputPath) {
    await fs.promises.copyFile(inputPath, `${inputPath}.bak`);
  }
  await fs.promises.writeFile(outputPath, lockV1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

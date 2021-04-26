import fs from "fs";
import process from "process";
import yargs from "yargs";
import yaml from "js-yaml";
import { convertLockfile, YarnRc } from "./convert";

const { f: inputPath, o: outputPath, c: yarnrcPath } = yargs
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
  .option('c', {
    alias: 'yarnrc',
    describe: 'path to .yarnrc.yml',
    default: '.yarnrc.yml',
    type: 'string',
  })
  .strict()
  .help()
  .argv;

const V1_HEADER = "# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.\n# yarn lockfile v1\n";

(async () => {
  let yarnrc: YarnRc | undefined = undefined;
  if (fs.existsSync(yarnrcPath)) {
    yarnrc = yaml.load(await fs.promises.readFile(yarnrcPath, 'utf-8')) as YarnRc;
  }
  const lockV2 = await fs.promises.readFile(inputPath, 'utf-8');
  if (lockV2.startsWith(V1_HEADER)) {
    throw new Error("yarn.lock is already v1");
  }
  const lockV1 = await convertLockfile(lockV2, { yarnrc });
  if (inputPath === outputPath) {
    await fs.promises.copyFile(inputPath, `${inputPath}.bak`);
  }
  await fs.promises.writeFile(outputPath, lockV1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

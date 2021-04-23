import fs from "fs";
import { convertLockfile } from "./convert";

const lockV2 = fs.readFileSync('yarn.lock', 'utf-8');
const lockV1 = convertLockfile(lockV2);
fs.writeFileSync('yarn.lock.v1', lockV1);

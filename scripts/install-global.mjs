#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "skills", "finn-project");
const destination = join(homedir(), ".claude", "skills", "finn-project");
const force = process.argv.includes("--force");

if (existsSync(destination) && !force) {
  console.error(`Refusing to replace existing ${destination}. Rerun with --force after reviewing it.`);
  process.exit(1);
}

mkdirSync(dirname(destination), { recursive: true });
if (existsSync(destination)) rmSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });
console.log(`Installed finn-project at ${destination}`);

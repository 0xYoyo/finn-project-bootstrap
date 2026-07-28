#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundledRoot = join(skillRoot, "assets", "finn-loop");
const skillNames = ["finn-spec", "finn-build", "finn-review"];

function fail(message) {
  console.error(`finn-project: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = { target: process.cwd(), team: "", repo: "", force: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") values.force = true;
    else if (arg === "--dry-run") values.dryRun = true;
    else if (["--target", "--team", "--repo"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${arg} requires a value`);
      values[arg.slice(2)] = value;
      index += 1;
    } else fail(`unknown argument: ${arg}`);
  }
  return values;
}

function git(root, args, fallback = "") {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

function normalizeRepository(remote) {
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  return match ? `${match[1]}/${match[2]}` : "";
}

function writeAtomic(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.finn-project-tmp-${process.pid}`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function plannedWrite(path, content, options) {
  const existed = existsSync(path);
  if (existed) {
    const current = readFileSync(path, "utf8");
    if (current === content) return "unchanged";
    if (!options.force) {
      fail(`refusing to overwrite differing file ${path}; inspect it or rerun with explicit --force`);
    }
  }
  if (!options.dryRun) writeAtomic(path, content);
  return existed ? "updated" : "created";
}

const options = parseArgs(process.argv.slice(2));
const target = resolve(options.target);
if (!existsSync(join(target, ".git"))) {
  fail(`${target} is not a Git repository; initialize Git first`);
}

const team = options.team.trim().toUpperCase();
if (!/^[A-Z][A-Z0-9]{0,9}$/.test(team)) {
  fail("--team must be a 1-10 character uppercase Linear team key");
}

const provenance = JSON.parse(readFileSync(join(bundledRoot, "UPSTREAM.json"), "utf8"));
const results = [];

for (const skillName of skillNames) {
  const source = join(bundledRoot, "skills", skillName, "SKILL.md");
  const destination = join(target, ".claude", "skills", skillName, "SKILL.md");
  const original = readFileSync(source, "utf8");
  const installed = original.replace(/\bTEAM\b/g, team);
  if (/\bTEAM\b/.test(installed)) fail(`${skillName} still contains a TEAM placeholder`);
  results.push({ path: destination, action: plannedWrite(destination, installed, options) });
}

const existingConfigPath = join(target, ".finn-loop.json");
let existingConfig = {};
if (existsSync(existingConfigPath)) {
  try {
    existingConfig = JSON.parse(readFileSync(existingConfigPath, "utf8"));
  } catch {
    fail(".finn-loop.json exists but is not valid JSON");
  }
}

const origin = git(target, ["config", "--get", "remote.origin.url"]);
const currentBranch = git(target, ["branch", "--show-current"], "main") || "main";
const repository = options.repo || normalizeRepository(origin);
const config = {
  ...existingConfig,
  schemaVersion: 1,
  linearTeamKey: team,
  githubRepository: repository || null,
  defaultBranch: existingConfig.defaultBranch || currentBranch,
  finnLoopSource: {
    repository: provenance.repository,
    commit: provenance.commit,
    capturedAt: provenance.capturedAt,
  },
  governance: {
    oneIssuePerPullRequest: true,
    humanAppliesAgentReady: true,
    humanMergeOnly: true,
  },
};
const configContent = `${JSON.stringify(config, null, 2)}\n`;
results.push({
  path: existingConfigPath,
  action: plannedWrite(existingConfigPath, configContent, options),
});

for (const result of results) {
  console.log(`${result.action.padEnd(9)} ${result.path}`);
}
console.log(options.dryRun ? "Dry run complete." : `Finn-loop installed for Linear team ${team}.`);

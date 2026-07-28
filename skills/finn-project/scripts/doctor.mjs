#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundledRoot = join(skillRoot, "assets", "finn-loop");
const skillNames = ["finn-spec", "finn-build", "finn-review"];

function parseArgs(argv) {
  const values = { target: process.cwd(), online: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--online") values.online = true;
    else if (arg === "--json") values.json = true;
    else if (arg === "--target") {
      values.target = argv[index + 1] || "";
      index += 1;
    } else {
      console.error(`finn-project: unknown argument ${arg}`);
      process.exit(1);
    }
  }
  return values;
}

function commandAvailable(command) {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

function claudeVersion() {
  const result = spawnSync("claude", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const match = `${result.stdout} ${result.stderr}`.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return { text: `${result.stdout} ${result.stderr}`.trim(), supported: false };
  const parts = match.slice(1).map(Number);
  const supported =
    parts[0] > 2 ||
    (parts[0] === 2 && (parts[1] > 1 || (parts[1] === 1 && parts[2] >= 71)));
  return { text: match[0], supported };
}

function run(command, args, cwd) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: String(error.stderr || error.message || "").trim(),
    };
  }
}

const options = parseArgs(process.argv.slice(2));
const target = resolve(options.target);
const checks = [];
const add = (name, status, detail) => checks.push({ name, status, detail });

add("git", commandAvailable("git") ? "pass" : "fail", "Git is required");
add("gh", commandAvailable("gh") ? "pass" : "fail", "GitHub CLI is required");
const detectedClaude = claudeVersion();
add(
  "claude",
  detectedClaude?.supported ? "pass" : "warn",
  detectedClaude ? `${detectedClaude.text}; Finn-loop requires 2.1.71+` : "Install Claude Code 2.1.71+ before first use",
);
add("repository", existsSync(join(target, ".git")) ? "pass" : "fail", target);

const configPath = join(target, ".finn-loop.json");
let config = null;
if (!existsSync(configPath)) {
  add("config", "fail", ".finn-loop.json is missing");
} else {
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
    add("config", config.linearTeamKey ? "pass" : "fail", config.linearTeamKey || "missing team key");
  } catch {
    add("config", "fail", ".finn-loop.json is invalid JSON");
  }
}

const team = config?.linearTeamKey || "";
for (const skillName of skillNames) {
  const installedPath = join(target, ".claude", "skills", skillName, "SKILL.md");
  if (!existsSync(installedPath)) {
    add(skillName, "fail", "skill is missing");
    continue;
  }
  const installed = readFileSync(installedPath, "utf8");
  const frontmatter = installed.match(/^---\n([\s\S]*?)\n---\n/);
  const validName = frontmatter?.[1].split("\n").some((line) => line.trim() === `name: ${skillName}`);
  const noPlaceholder = !/\bTEAM\b/.test(installed);
  const usesTeam = team ? new RegExp(`\\b${team}\\b`).test(installed) : false;
  const bundled = readFileSync(join(bundledRoot, "skills", skillName, "SKILL.md"), "utf8");
  const expected = team ? bundled.replace(/\bTEAM\b/g, team) : "";
  const drifted = Boolean(expected) && installed !== expected;
  add(
    skillName,
    validName && noPlaceholder && usesTeam ? (drifted ? "warn" : "pass") : "fail",
    drifted ? "valid but differs from the pinned upstream snapshot" : "frontmatter and team configuration",
  );
}

const worktree = run("git", ["status", "--porcelain"], target);
add("worktree", worktree.ok && !worktree.output ? "pass" : "warn", worktree.output || "clean");

if (options.online && commandAvailable("gh")) {
  const auth = run("gh", ["auth", "status"], target);
  add("github-auth", auth.ok ? "pass" : "fail", auth.ok ? "authenticated" : auth.output);
  const repo = run("gh", ["repo", "view", "--json", "nameWithOwner,defaultBranchRef"], target);
  add("github-repository", repo.ok ? "pass" : "fail", repo.ok ? repo.output : repo.output);
  if (repo.ok) {
    const labels = run("gh", ["label", "list", "--json", "name", "--limit", "200"], target);
    if (labels.ok) {
      const names = new Set(JSON.parse(labels.output).map((label) => label.name));
      const required = ["loop-approved", "loop-changes-requested", "needs-human-review"];
      const missing = required.filter((name) => !names.has(name));
      add("github-labels", missing.length ? "fail" : "pass", missing.length ? `missing: ${missing.join(", ")}` : "all required labels exist");
    } else add("github-labels", "fail", labels.output);
  }
}

const failed = checks.filter((check) => check.status === "fail").length;
const warned = checks.filter((check) => check.status === "warn").length;
if (options.json) {
  console.log(JSON.stringify({ target, failed, warned, checks }, null, 2));
} else {
  for (const check of checks) {
    console.log(`${check.status.toUpperCase().padEnd(5)} ${check.name}: ${check.detail}`);
  }
  console.log(`\n${failed} failed, ${warned} warnings.`);
}
process.exitCode = failed ? 1 : 0;

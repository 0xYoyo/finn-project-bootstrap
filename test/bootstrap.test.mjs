import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installer = join(root, "skills", "finn-project", "scripts", "install-project.mjs");
const doctor = join(root, "skills", "finn-project", "scripts", "doctor.mjs");
const bundled = join(root, "skills", "finn-project", "assets", "finn-loop");

function project() {
  const path = mkdtempSync(join(tmpdir(), "finn-project-test-"));
  execFileSync("git", ["init", "-b", "main", path], { stdio: "ignore" });
  return path;
}

test("installs exact TEAM-configured Finn skills and project metadata", () => {
  const target = project();
  execFileSync("node", [installer, "--target", target, "--team", "ENG", "--repo", "owner/app"]);

  for (const name of ["finn-spec", "finn-build", "finn-review"]) {
    const source = readFileSync(join(bundled, "skills", name, "SKILL.md"), "utf8");
    const installed = readFileSync(join(target, ".claude", "skills", name, "SKILL.md"), "utf8");
    assert.equal(installed, source.replace(/\bTEAM\b/g, "ENG"));
    assert.doesNotMatch(installed, /\bTEAM\b/);
  }

  const config = JSON.parse(readFileSync(join(target, ".finn-loop.json"), "utf8"));
  assert.equal(config.linearTeamKey, "ENG");
  assert.equal(config.githubRepository, "owner/app");
  assert.equal(config.governance.humanMergeOnly, true);

  execFileSync("node", [installer, "--target", target, "--team", "ENG", "--repo", "owner/app"]);
  const result = spawnSync("node", [doctor, "--target", target, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("refuses to overwrite a changed installed skill", () => {
  const target = project();
  execFileSync("node", [installer, "--target", target, "--team", "APP"]);
  const path = join(target, ".claude", "skills", "finn-build", "SKILL.md");
  writeFileSync(path, `${readFileSync(path, "utf8")}\nlocal change\n`);

  const result = spawnSync("node", [installer, "--target", target, "--team", "APP"], {
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to overwrite differing file/);
});

test("rejects invalid team keys before writing project files", () => {
  const target = project();
  const result = spawnSync("node", [installer, "--target", target, "--team", "not-valid"], {
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /uppercase Linear team key/);
});

test("dry run does not create project files", () => {
  const target = project();
  execFileSync("node", [
    installer,
    "--target",
    target,
    "--team",
    "APP",
    "--dry-run",
  ]);
  assert.throws(() => readFileSync(join(target, ".finn-loop.json"), "utf8"));
});

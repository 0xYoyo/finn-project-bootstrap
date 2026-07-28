---
name: finn-project
description: Set up, inspect, repair, or summarize an isolated Finn-loop project for Claude Code. Use when creating a new project repository, installing Finn-loop without changing its semantics, checking project readiness, or asking what currently needs human attention.
---

# Finn Project

Manage one repository as one isolated Finn-loop ecosystem. Never route work
through a central factory and never let one repository claim another project's
Linear issues.

## Choose the operation

- `setup`: configure the current repository. Use this when `.finn-loop.json`
  does not exist or the user asks to initialize/onboard the project.
- `status`: perform a read-only founder-status check. Use this for an already
  configured project unless the user requests another operation.
- `doctor`: inspect setup drift and repair only safe, reversible omissions.

Treat an invocation without an explicit operation as `setup` when the project
is unconfigured and `status` otherwise.

## Invariants

- Work only in the current Git repository.
- Use one GitHub repository and one dedicated Linear team key per project.
- Copy the bundled Finn skills without semantic edits. Replace only standalone
  `TEAM` placeholders with the configured Linear key.
- Only a human applies Linear's `agent-ready` label.
- Agents never merge or enable auto-merge.
- Preserve dirty or unrelated user work.
- Default new GitHub repositories to private.
- Never overwrite an installed Finn skill that differs from the bundled
  snapshot without explicit approval.
- Do not add API keys, usage-credit fallbacks, hosted controllers, schedulers,
  or central factory dependencies.

## Setup

Read [references/setup.md](references/setup.md) completely, then follow it.
Use the deterministic installer at
`${CLAUDE_SKILL_DIR}/scripts/install-project.mjs` for local files.

## Status

Read [references/status.md](references/status.md) completely. Return only a
short ordered action list plus a compact pipeline summary. Do not mutate
Linear, GitHub, Git, or project files.

## Doctor

Run:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/doctor.mjs" --target "$PWD" --online
```

Repair missing labels or configuration only when the intended value is
unambiguous. Do not replace drifted skills automatically. Report UI-only
requirements with exact navigation and stop after the first genuinely blocking
user action.

## Bundled source

The original Finn skills, README, license, and provenance are stored under
`assets/finn-loop/`. This snapshot is the installation source; network access
to the public Finn repository is not required.

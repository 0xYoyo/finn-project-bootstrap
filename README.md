# Finn project bootstrap

One personal Claude Code skill for isolated, per-repository Finn-loop projects.
It carries a pinned upstream Finn-loop snapshot, so new projects do not depend
on the public repository being available.

## One-time installation

```bash
node scripts/install-global.mjs
```

This installs `finn-project` into `~/.claude/skills/finn-project`.

## New project

Open Claude Code in the project's folder and run:

```text
/finn-project setup
```

Claude handles repository setup, Finn skill installation, labels, checks, and
readiness verification. It asks only for values it cannot infer, normally the
dedicated Linear team key.

## Daily use

```text
/finn-spec
/loop /finn-build
/loop /finn-review
```

Use `/finn-project status` for a compact list of what needs your attention and
`/finn-project doctor` to check setup drift.

The project remains human-gated: only a human applies `agent-ready`, and agents
never merge.

# Project setup

## 1. Preflight

1. Resolve the current Git root. If the folder is not a repository, initialize
   it only when the user invoked setup for that folder.
2. Inspect, but do not modify, existing work.
3. Verify `claude`, `git`, and `gh` are available. Require Claude Code 2.1.71
   or newer.
4. Verify Claude is authenticated through the user's Claude subscription, not
   `ANTHROPIC_API_KEY`. Never add or offer usage-credit fallback.
5. Infer the GitHub repository and default branch when possible.

## 2. Resolve only missing inputs

Ask only for values that cannot be inferred:

- project name;
- dedicated Linear team key;
- GitHub owner when more than one is available.

Default a missing GitHub repository to private. A dedicated Linear team is
required because the upstream builder selects work by team key, not by Linear
Project.

## 3. Establish GitHub safely

If Git is new, create an intentional initial commit before pushing. If `origin`
is missing, create a private GitHub repository from the current folder. Never
replace an existing remote or change repository visibility.

Detect the actual default branch. Do not assume `main`.

## 4. Install project files

Run:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/install-project.mjs" \
  --target "$PWD" \
  --team "TEAM_KEY" \
  --repo "OWNER/REPOSITORY"
```

The installer writes:

- `.claude/skills/finn-spec/SKILL.md`
- `.claude/skills/finn-build/SKILL.md`
- `.claude/skills/finn-review/SKILL.md`
- `.finn-loop.json`

It refuses to overwrite differing skill files. Do not bypass that protection
unless the user explicitly approves replacing local skill customizations.

## 5. Configure Linear

Using the connected Linear tools:

1. Confirm the configured team exists and its key matches exactly.
2. Confirm a workflow state of type `started` exists.
3. Create missing labels idempotently:
   - `agent-ready`
   - `blocked`
4. Never apply `agent-ready`.
5. Recommend Linear's GitHub integration only when it is not already connected.

If the dedicated Linear team does not exist and the connector cannot create
teams, give the user the exact single UI action required, then wait.

## 6. Configure GitHub

Create these labels idempotently:

- `loop-approved`
- `loop-changes-requested`
- `needs-human-review`

Inspect the actual stack, lockfile, package scripts, and existing workflows.
When required CI is absent, create the smallest correct workflow that runs the
repository's real tests and build. Do not invent commands.

Run the same checks locally. Commit only intentional onboarding files and push
them. Required-check enforcement may need a GitHub plan or UI action; report
that accurately instead of claiming it is enabled.

## 7. Smoke test

Verify:

- all three skills contain valid YAML frontmatter;
- no standalone `TEAM` placeholder remains;
- the configured team key appears in every necessary contract;
- Linear can list the team's labels and workflow states;
- `gh auth status` and `gh repo view` work;
- the GitHub labels exist;
- the default branch is correct;
- required GitHub checks are discoverable.

Tell the user to run `/reload-skills` if Claude does not discover newly created
project skills.

## 8. Handoff

Finish with only:

- readiness: ready or blocked;
- the one remaining user action, if any;
- first-use commands:
  - `/finn-spec`
  - `/loop /finn-build`
  - `/loop /finn-review`
- reminder: merge only `loop-approved`, conflict-free PRs with green required
  checks after inspecting the preview.

# Founder status

Read `.finn-loop.json`, then inspect the configured Linear team and current
GitHub repository without modifying anything.

## Sources

- Linear: `agent-ready`, `blocked`, assignee, status, and blocker relations.
- GitHub: open PRs, Finn labels, required checks, conflicts, current head SHA,
  and merge state.
- Git: current branch and worktree cleanliness.

## Output order

1. **Needs you now**
   - specifications awaiting `agent-ready`;
   - concrete blocked questions;
   - `needs-human-review` PRs;
   - `loop-approved` PRs with green required checks.
2. **Agents handling**
   - claimed issues;
   - PRs awaiting CI or review;
   - `loop-changes-requested` repairs.
3. **Setup problems**
   - missing required checks or labels;
   - conflicting PRs;
   - dead or missing loop sessions when observable.
4. **Queue**
   - eligible approved issues;
   - empty queue.

Keep the response compact. Link directly to relevant Linear issues and GitHub
PRs. Do not repeat healthy details that require no action.

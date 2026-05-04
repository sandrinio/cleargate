# cleargate

**ClearGate** gives Claude Code a disciplined ship-loop — proposals → epics → stories → sprints → five-role agent execution (architect plans, developer codes, qa verifies, devops merges, reporter retrospects). One command bootstraps a downstream repo:

```bash
npx cleargate init
```

Includes a Karpathy-style awareness wiki so every session starts with full situational context, not blind grep.

> Full project + design docs: https://github.com/sandrinio/cleargate

## Install

```bash
npx cleargate init        # one-off, no install
npm i -g cleargate        # global, exposes `cleargate` on PATH
npm i -D cleargate        # local devDep, run via `npx cleargate ...`
```

## Commands

```bash
cleargate init                      # scaffold a target repo (CLAUDE.md block, .claude/, .cleargate/)
cleargate doctor                    # check scaffold health — drift, missing hooks, blocked items
cleargate wiki build                # full rebuild from .cleargate/delivery/ → .cleargate/wiki/
cleargate wiki ingest <file>        # single-file update (also called by PostToolUse hook)
cleargate wiki query "<topic>"      # read-only synthesis with [[ID]] citations
cleargate wiki query "<topic>" --persist   # file the answer to wiki/topics/<slug>.md (Karpathy compounding)
cleargate wiki lint                 # drift check — exits non-zero on inconsistency, blocks Gates 1 + 3
cleargate wiki lint --suggest       # advisory mode — surfaces candidate cross-refs, exits 0
cleargate join <invite-url>         # join an existing ClearGate workspace via MCP
cleargate sprint init               # initialize a sprint — cut sprint branch, create state.json
cleargate sprint preflight          # Gate 3 readiness check — no orphans, no ambiguity drift
cleargate sprint close              # close a sprint — runs lifecycle reconciler, prints handoff summary
cleargate gate check                # run the configured gate command (test/typecheck/lint/precommit)
cleargate state update <id> <state> # transition a work item to the given state
cleargate state validate            # validate state.json against the schema
cleargate story start <id>          # create worktree + branch for a story, flip state to In Progress
cleargate story done <id>           # mark a story done after DevOps merge (alias for state update Done)
cleargate story bouncing <id>       # flag a story as bouncing (QA kick-back); increments bounce counter
```

After `init`, edits to `.cleargate/delivery/**` auto-trigger `wiki ingest` via the PostToolUse hook. The wiki stays fresh; no manual maintenance.

### Dogfood

ClearGate framework maintainers who work directly in the meta-repo can install the scaffold from the local `cleargate-planning/` directory instead of the published npm package:

```bash
# In a fresh target directory:
cleargate init --from-source /path/to/cleargate-repo/cleargate-planning
```

This routes through the same `copyPayload` code path that downstream users hit, closing the dogfood gap where the meta-repo previously edited `cleargate-planning/` in place and never exercised the `cleargate init` flow. All other `init` behaviour (MANIFEST.json generation, overwrite policies, prompt flow, exit codes) is identical. The `--from-source` path must contain `.claude/`, `.cleargate/`, and `CLAUDE.md` at its root; the command exits 2 with a clear error if any are missing.

## Requirements

Node ≥ 24 LTS. `git` available on PATH (for content-hash drift detection).

## License

MIT — see the [project LICENSE](https://github.com/sandrinio/cleargate/blob/main/LICENSE).

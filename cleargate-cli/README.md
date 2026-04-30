# cleargate

**ClearGate** gives Claude Code a disciplined ship-loop — proposals → epics → stories → sprints → four-agent execution (architect plans, developer codes, qa verifies, reporter retrospects). One command bootstraps a downstream repo:

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
cleargate wiki build                # full rebuild from .cleargate/delivery/ → .cleargate/wiki/
cleargate wiki ingest <file>        # single-file update (also called by PostToolUse hook)
cleargate wiki query "<topic>"      # read-only synthesis with [[ID]] citations
cleargate wiki query "<topic>" --persist   # file the answer to wiki/topics/<slug>.md (Karpathy compounding)
cleargate wiki lint                 # drift check — exits non-zero on inconsistency, blocks Gates 1 + 3
cleargate wiki lint --suggest       # advisory mode — surfaces candidate cross-refs, exits 0
cleargate join <invite-url>         # join an existing ClearGate workspace via MCP
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

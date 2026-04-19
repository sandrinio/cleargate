# cleargate

**ClearGate** scaffolds Claude Code into a disciplined planning loop — proposals → epics → stories → sprints → execution via a four-agent team (architect / developer / qa / reporter). One command bootstraps a downstream repo:

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

## Requirements

Node ≥ 24 LTS. `git` available on PATH (for content-hash drift detection).

## License

MIT — see the [project LICENSE](https://github.com/sandrinio/cleargate/blob/main/LICENSE).

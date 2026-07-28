---
work_item: CR-086
sprint: SPRINT-38
wave: 6
agent: developer
status: done
transcribed_by: orchestrator
commit: 65ce9cf8
---

# CR-086 — Developer report

`STATUS: done` · `TYPECHECK: pass` · e2e **21/21** under `CLEARGATE_META_ROOT=<worktree>`;
legacy harness `test_file_surface.sh` **6/6** (unedited); full cli suite targeted at the worktree
2209 passed / 2 failed (both the known `close-sprint-assume-ack-guard` ENOENT cross-repo artifact).

**Three layers, one commit** (`65ce9cf8`), each per the M3 plan's chosen mechanism:
- **L1 dispatcher** — `while [ -L ]` + single-arg `readlink` + `cd -P`, with a `case` split handling
  both relative and absolute link targets (this repo's link is absolute, which CR-086 had assumed
  relative). No `readlink -f` — GNU-only; the machine runs bash 3.2.57.
- **L2 sentinel** — new `resolve_sprint_state_root()` off
  `git rev-parse --path-format=absolute --git-common-dir` with three fallbacks; `REPO_ROOT` stays
  the worktree so staged files, whitelist, and the story file (self-amendment rule) don't move.
  `STATE_JSON_GLOB` repointed to the main root.
- **L3 parser** — split the Value cell on `", "` first, then take the first backtick-quoted span per
  segment via `index()`/`substr()` (BWK-awk safe); dropped the blanket `gsub(/`/,"",val)`.

Files: canonical `pre-commit.sh`, `file_surface_diff.sh`, `cleargate-enforcement.md`; live-root
`file_surface_diff.sh`, `cleargate-enforcement.md`. Live `/.claude/hooks/pre-commit.sh` deliberately
untouched (Gate-4 arming step). No prebuild, no MANIFEST, no templates, no dist.

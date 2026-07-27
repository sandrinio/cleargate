---
work_item: CR-086
sprint: SPRINT-38
wave: 6
agent: architect
modes: [plan, post-flight]
verdict: PASS
transcribed_by: orchestrator
plan: .cleargate/sprint-runs/SPRINT-38/plans/M3.md
---

# CR-086 — Architect report

## Plan (M3.md)
Chose the mechanism per layer and enumerated every `exit 0` in `file_surface_diff.sh` (E1-E11) with
a keep/change ruling — only E5's *resolution* changes, its exit code untouched. Ruled `:318`
("`cleargate init` installs the symlink") should be **corrected in the doc, not implemented**:
zero `symlinkSync` in `cleargate-cli/src/**`, and `ln -sf` would silently clobber husky/lefthook.

**Corrections to CR-086 found while grounding:** this repo's hook symlink is **absolute**, not the
documented relative form (a relative-only fix would have left the meta-repo broken); `state.json`
must move to the main root alongside `.active` (it is tracked, so the worktree carries a *stale*
copy); and the CR's "documented in three places" is two.

## Post-flight — `ARCHITECT: PASS`
No material deviations; all three layers match the plan mechanism-for-mechanism. Sandbox respected.
**No new silent exit-0** — old and new both have exactly five `exit 0` statements; the blocking
decision block, whitelist matcher, and `normalize_path` are byte-unchanged.

Hunted the highest-risk class here — a fix that satisfies the tmpdir fixture but not the real
invocation path — and found none: ran the landed script in both real topologies (nested
`.worktrees/CR-086` and the main checkout from a subdirectory), sentinel and story file resolving
correctly in each. Noted that the wrapper executes the **live-root** tier while the test targets
canonical; that gap is closed by the byte-identity assertion, re-confirmed by `diff`.

## Two hazards this CR surfaced but does not fix — carry-over CRs
- **CR-A (highest priority).** `pre-commit-surface-gate.sh:26` runs
  `npm run check:no-vitest --prefix mcp|cleargate-cli|admin` — measured **exit 254** in any repo
  lacking those directories. Latent only because the dispatcher was dead; **CR-086 arms it**. Once
  the payload ships, this hard-blocks every commit in any downstream repo that follows §6.5.
- **CR-D.** With the gate live, `resolve_story_file()`'s most-recently-updated fallback measures
  Gate-4 close commits against a *finished* story's §3.1 — close-out commits will need
  `SKIP_SURFACE_GATE=1`, logged.

## GATE4_OWED
1. Hand-port L1 into live `/.claude/hooks/pre-commit.sh` — one hunk; nothing mechanical checks
   `pre-commit.sh` parity, so `diff` by hand after.
2. **Do NOT sync `pre-commit-surface-gate.sh`** — pre-existing drift, and CR-A applies.
3. Pre-arm checks: the live `pre-commit-*.sh` glob matches exactly one file (verified: only
   `pre-commit-surface-gate.sh`, mode 755), and `.git/hooks/pre-commit` is the absolute link form.
4. **Arming makes this repo's own commits gated for the first time, and the first ones will BLOCK —
   proven by a scratch-index dry run, not predicted.** With `.active=SPRINT-38` and all nine stories
   `Done`, the fallback resolves STORY-051-09; staging `plans/M3.md` + the CR-086 delivery doc exits
   **1**. The whitelist admits `MANIFEST.json`, `.cleargate/hook-log/*`, `token-ledger.jsonl`,
   `.pending-task-*.json`, `state.json` — but **not** `.cleargate/delivery/**`,
   `.cleargate/sprint-runs/**/*.md`, or `FLASHCARD.md`.

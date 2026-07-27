---
work_item: CR-087
sprint: SPRINT-38
wave: 7
agent: architect
modes: [plan, post-flight]
verdict: PASS
publish_safe_on_this_hazard: yes
transcribed_by: orchestrator
plan: .cleargate/sprint-runs/SPRINT-38/plans/M3.md (wave-7 section, :819-1305)
---

# CR-087 — Architect report

## Plan
Guard by `grep`, **not `jq`**: six shipped hooks do use jq, but those are Claude-Code lifecycle hooks
where an absent jq merely degrades — this is a `set -e` git pre-commit hook where absent jq means a
blocked commit, i.e. the exact bug class CR-087 exists to delete. The wrapper has zero external tool
deps today; keep it at zero. The regex is colon-anchored because a bare substring grep
false-positives on `{"scripts":{"pre":"npm run check:no-vitest"}}`.

Three rulings inside the CR's latitude: **W7-A1** hook edit is canonical-only (the gitignored live
twin has no line 26 to diff against); **W7-A2** `enforcement.md` §6.2 + §6.6 gain ~3 lines in both
tiers, so the new skipped-prefix exit-0 path has a documented home; **W7-A3** tests go in a new
sibling file — extending CR-086's suite would have required parameterising a helper that 8 live legs
call, and *a control you edited is not a control*.

**Corrections to CR-087 found while grounding:** the CR quoted line 26 without its `2>/dev/null`,
and "`-s` guarantees zero bytes" holds only for the missing-dir shape — a *script* failure still
emits 23 bytes that `2>/dev/null` erases, so dropping only `-s` (the literal §0.5 Q3 ruling) would
have left assertion 2 red. Both flags go. Also: `mcp|cleargate-cli|admin` are gitignored **here**
(`.gitignore:62-64`), so every linked worktree of this meta-repo would have been blocked too once
Gate 4 syncs the dispatcher.

## Post-flight — `ARCHITECT: PASS`
No deviations; landed hook is byte-for-byte the planned block. Verified **10 real-invocation repo
shapes** with a full install and a real `git commit`, each exiting 0 with HEAD advancing and the
chain provably *live* (each emits the delegate's `No active story file found` warning): no root
`package.json` · root `package.json` present (the measured-254 shape) · monorepo with an unrelated
`mcp/` · `mcp/` with no `package.json` · `mcp/` that only references the script · `mcp/` that
genuinely defines it · **npm absent from PATH** · **commit from a subdirectory** (a cwd case the
fixture never exercises — passes only because the guard uses absolute paths; the old relative
`--prefix mcp` was cwd-dependent) · repo path containing a space · linked worktree. Teeth control
blocks in all three seeded shapes.

`PUBLISH_SAFE_ON_THIS_HAZARD: yes.` npx/devDep installs are unaffected — nothing in the pre-commit
chain invokes `cleargate`, `npx`, `node` or `jq`; it is git + bash + grep, with npm gated behind
`command -v`.

## Discovery: the check this gate protects is itself a no-op (pre-existing, not caused here)

Wiring is intact — all three real scripts execute — but in all three packages the pattern reaching
grep is a literal `U+0008` BACKSPACE, not `\b`: `package.json` holds `\\b`, the shell hands `node -e`
a `\b`, and the **JS single-quoted string literal inside `execSync('…')` consumes it**. Measured: a
scratch package running the verbatim `cleargate-cli` script over `import { vi } from 'vitest'` prints
`no vitest residue` and exits 0, while the same script over `<BS>vitest<BS>` exits 1. Identical for
`mcp` and `admin`.

So CR-087 weakens nothing — invocation is preserved exactly — but "would the meta-repo still catch a
vitest reintroduction?" is **no**, and was already no before this sprint. A defined-but-dead gate of
precisely the class EPIC-051 was chartered to eliminate. Carry-over.

## Named carry-overs
- **W7-CarryOver-E** — `enforcement.md:302` claims a per-package pre-commit convention that does not
  exist (`cleargate-cli/.git/hooks/pre-commit` and `mcp/.git/hooks/pre-commit` are absent). The
  guarded loop is the only pre-commit enforcement of `check:no-vitest` anywhere.
- **W7-CarryOver-F** — extract `test/scaffold/_hook-fixture.ts`; the two suites duplicate ~60 lines
  of git/fixture primitives. Deliberately deferred until both shapes settle.
- **W7-CarryOver-G (EPIC-045)** — the `mcp|cleargate-cli|admin` list is meta-repo vocabulary in a
  file that ships everywhere. Guarded now, generalise later; config-schema decision.
- **NEW — the `\b`→backspace defect above.** Highest-value of the four: the guard now correctly runs
  a check that cannot fail.

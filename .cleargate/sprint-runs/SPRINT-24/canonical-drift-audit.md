# CR-049 Canonical-vs-Live Drift Audit Report

**Date:** 2026-05-04
**Sprint:** SPRINT-24
**Auditor:** Developer (CR-049)
**Scope:** `cleargate-planning/` (canonical) vs `.cleargate/` and `.claude/` (live)

---

## 1. Known Drifts Fixed by CR-049

| File | Direction | Root Cause | Action |
|---|---|---|---|
| `.cleargate/scripts/write_dispatch.sh` | canonical behind live | CR-044 added `devops` to agent_type allowlist + validate-block; canonical not updated | Synced (cp live → canonical) |
| `.cleargate/scripts/validate_state.mjs` | canonical behind live | CR-045 added `validateShapeIgnoringVersion` export + `validateState` refactored to delegate; canonical had older single-function version | Synced (cp live → canonical) |
| `.cleargate/scripts/test/test_flashcard_gate.sh` | canonical behind live | Protocol §-ref updated from §4 → §18 in 6 places in live; canonical still referenced §4 | Synced (cp live → canonical) |
| `.cleargate/scripts/test/test_test_ratchet.sh` | no drift | Architect confirmed pre-Dev: diff returned empty | NO-OP (already in parity) |

Post-sync verification: all 4 `diff` calls returned exit 0 (byte-identical).

---

## 2. Extended Audit Beyond 4 Named Scripts

### `.cleargate/templates/*.md`

**Result: No drift.** All template files in canonical match live exactly.

### `.cleargate/knowledge/*.md`

**Result: No drift.** All knowledge files in canonical match live exactly.

### `.claude/agents/*.md` (checked from main repo; gitignored in worktrees)

**Result: No drift.** All 9 agent files in canonical match live exactly.
Files checked: `architect.md`, `cleargate-wiki-contradict.md`, `cleargate-wiki-ingest.md`,
`cleargate-wiki-lint.md`, `cleargate-wiki-query.md`, `developer.md`, `devops.md`, `qa.md`, `reporter.md`.

### `.claude/hooks/*.sh` (checked from main repo; gitignored in worktrees)

**Result: 2 files differ (expected — version-pin substitution by CR-009, not problematic drift).**

| File | Nature of Diff |
|---|---|
| `session-start.sh` | Canonical has `__CLEARGATE_VERSION__` placeholder; live has `0.10.0` pinned (applied by `cleargate init`) |
| `stamp-and-gate.sh` | Same version-pin substitution |

These diffs are intentional by design (CR-009 version-pin mechanism). `cleargate init` substitutes the placeholder on install. This is NOT drift requiring remediation.

### `.claude/skills/` (checked from main repo)

**Result: No drift.** All skill files in canonical match live exactly.

---

## 3. Total Drift Count Beyond 4 Named Scripts

- **Unexpected drift count: 0** (hooks version-pin diff is by-design, not unexpected drift)
- **Scope-cut threshold not triggered** (threshold: >15 unexpected drifted paths)

---

## 4. Summary

CR-049 fixed 3 of 4 named drifts (4th was already in parity). Extended audit across agents, templates, knowledge, hooks, and skills found zero additional unexpected drift. The canonical and live scaffolds are now in alignment for all tracked surfaces.

The hooks version-pin diff (`__CLEARGATE_VERSION__` vs `0.10.0`) is architectural by design (CR-009) and does not represent a maintenance burden — it self-heals on each `cleargate init` run.

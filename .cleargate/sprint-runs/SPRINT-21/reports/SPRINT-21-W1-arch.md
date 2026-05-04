role: architect

# SPRINT-21 W1 Architect Post-Flight Review

**Commit:** `d109bf4` on `sprint/S-21`
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/SPRINT-21-W1`
**Items reviewed:** BUG-026, CR-031, CR-034, CR-037
**Verdict: PASS**

---

## Pre-gate Notes

`.cleargate/reports/pre-arch-scan.txt` reports `[FAIL] typecheck: exit code 1`. This is a runner false-positive — the worktree root `package.json` has no `typecheck` script. The real typecheck script lives in `cleargate-cli/package.json` and was run by Developer (per dev report). `new_deps: PASS`, `stray_env_files: PASS`. Treating typecheck FAIL as pre-existing infrastructure noise per review rubric.

`npm test -- readiness-predicates` in the worktree's `cleargate-cli/` reports **80 tests passing, 0 failing** (run at 2026-05-03 23:52). Build succeeds.

---

## Per-criterion findings

### 1. Hot file ordering compliance — PASS

Sprint plan §2.2 demands CR-031 (path resolution) and CR-034 (item-type extension) land additively in `cleargate-cli/src/lib/readiness-predicates.ts` with no overlapping line ranges.

Inspecting `git show d109bf4 -- cleargate-cli/src/lib/readiness-predicates.ts`:

- **CR-031 edit** (lines 270-294): replaces 4-line candidate list in `resolveLinkedPath()` with comment block + 4-candidate list. Self-contained, no overlap with CR-034.
- **CR-034 edits**: three discrete locations — type union (line 16), parsePredicate regex (lines 80, 86), evalSection dispatch (lines 494-496), and new `countDeclaredItems()` helper at end of file (lines 516-568).

No overlapping line ranges. The two CRs touch distinct regions of the file. Sequential additive merge per §2.2 satisfied.

### 2. Shared-surface contract (readiness-gates.md migration) — PASS

Sprint plan §2.3 + CR-034 §3 named the 6 criteria to migrate from `listed-item` to `declared-item`. Audit of post-commit `.cleargate/knowledge/readiness-gates.md`:

| Criterion | Expected | Actual | Result |
|---|---|---|---|
| `epic.scope-in-populated` (§3) | declared-item | declared-item (line 74) | ✓ |
| `epic.affected-files-declared` (§5) | declared-item | declared-item (line 76) | ✓ |
| `story.implementation-files-declared` (§3) | declared-item | declared-item (line 116) | ✓ |
| `story.dod-declared` (§4) | listed-item (STAYS) | listed-item (line 118) | ✓ |
| `cr.blast-radius-populated` (§2) | declared-item | declared-item (line 135) | ✓ |
| `cr.sandbox-paths-declared` (§3) | declared-item | declared-item (line 139) | ✓ |
| `bug.repro-steps-deterministic` (§2) | declared-item | declared-item (line 152) | ✓ |
| `proposal.architecture-populated` (§2) | listed-item (NOT in migration scope) | listed-item (line 57) | ✓ |
| `proposal.touched-files-populated` (§3) | listed-item (NOT in migration scope) | listed-item (line 59) | ✓ |

Six migrations + DoD stays + 2 proposal-gate `listed-item` retained. Concur with Developer's deviation note: §4.2's "≤2 matches" assertion is a CR-034 spec defect (the named §3 migration list authoritative; proposal gates correctly stay unmigrated). Predicate Vocabulary §3 doc updated with `declared-item` definition (lines 18-22).

Mirror parity verified:
- `diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` → empty ✓
- npm payload (`cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md`) synced via prebuild per Dev report.

**Bonus fix:** `sandbox-paths-declared` corrected from `section(2)` to `section(3)` (Execution Sandbox is §3 in the CR template). This was a pre-existing latent bug — Dev caught it during migration. Acceptable in-scope correction; flag as flashcard-worthy.

### 3. Mirror parity (architect.md canonical vs live) — PASS (with semantic clarification)

Literal command from review prompt — `diff .claude/agents/architect.md cleargate-planning/.claude/agents/architect.md` from repo root — produces non-empty output (canonical at repo root is missing CR-037 section, 155 lines vs live's 175).

**Why this is not a real drift:** Repo root (`/Users/ssuladze/Documents/Dev/ClearGate/`) HEAD is `b68afe9` (pre-W1). The W1 commit `d109bf4` lives only on the `sprint/S-21` branch's worktree. Canonical at repo root will become 175-line version once `sprint/S-21` merges back to main. Live `.claude/agents/architect.md` was hand-synced ahead of merge per Dogfood split protocol.

Verified the architecturally meaningful diffs (run from worktree):
- `diff /Users/ssuladze/Documents/Dev/ClearGate/.claude/agents/architect.md /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/SPRINT-21-W1/cleargate-planning/.claude/agents/architect.md` → **empty** ✓ (live = post-W1 canonical)
- `diff cleargate-planning/.claude/agents/architect.md cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` (within worktree) → **empty** ✓ (canonical = npm payload)

CR-037 section "Pre-Spec Dep Version Check" is present in canonical W1 worktree (lines 144-162) and live repo-root (lines 144-162). Three rules + skip-with-warning + L0 Code-Truth invocation all present per CR-037 §3 spec.

### 4. Test coverage — PASS

| Item | Spec required | Actual | Location |
|---|---|---|---|
| CR-031 | ≥5 | **5** (Scenarios 1-5) | `test/lib/readiness-predicates.test.ts:886-966` |
| CR-034 | ≥8 | **9** (parsePredicate + 8 scenarios incl. dod regression) | `test/lib/readiness-predicates.test.ts:968-1101` |
| BUG-026 | ≥1 regression | **2** (invalid-shape rejection + valid-shape acceptance) | `test/lib/readiness-predicates.test.ts:1103-end` |
| CR-037 | manual smoke (no automated) | n/a per spec §3 | — |

**Minor file-location deviation (BUG-026):** Spec named `cleargate-cli/test/scripts/test_update_state.test.ts` for the regression. Dev landed tests in `cleargate-cli/test/lib/readiness-predicates.test.ts` instead. The tests dynamically import `.cleargate/scripts/validate_state.mjs` and verify the `validateShapeIgnoringVersion` export at runtime — covers the regression intent. Architecturally equivalent. Flag for follow-up move only if tightening per-file convention is desired (low priority).

**Notable refactor in test file:** `SMOKE_REPO_ROOT` constant introduced (line 441) to replace 5 hardcoded `/Users/ssuladze/Documents/Dev/ClearGate` and `/Users/.../CR-028` paths with a worktree-relative resolution. This was necessary so the smoke tests would pass when run from a worktree. Architecturally clean fix; no plan deviation since the hardcoded path was a latent bug. Concur.

### 5. Bypass verification — PASS

`git log -1 --pretty=format:%B d109bf4` body contains no `--no-verify`, `[skip ci]`, `[skip-hooks]`, or other bypass annotations. Dev reports across all 4 items contain zero matches for "no-verify" via grep. Pre-commit hooks ran; commit lands clean.

### 6. Spec-deviation note (CR-034 §4.2 vs §3) — CONCUR with QA framing

Confirmed: CR-034 §4.2 acceptance #2 says "`grep listed-item` returns ≤2 matches" but §3 migration list names only 6 criteria — none from the proposal gate. The proposal-gate `architecture-populated` and `touched-files-populated` retain `listed-item` correctly per §3. Net `listed-item` count = 4 (vocabulary def + dod-declared + 2 proposal-gate criteria), which trips §4.2 but satisfies §3.

This is a CR-034 spec defect, not an implementation gap. The migration list (§3) is authoritative. Recommend a follow-up CR (or a one-line tightening) to reconcile §4.2 wording — see Recommended follow-ups.

---

## Recommended follow-ups

1. **CR-040 (one-liner spec tightening):** Update CR-034's §4.2 acceptance criterion #2 from "`grep listed-item` returns ≤2 matches" to "≤4 matches (vocab def + dod-declared + 2 proposal-gate criteria)" OR to a more durable form like "the 6 criteria named in §3 all show `declared-item`; no other gate criteria changed." Preferred form: latter — more resilient to future migrations. Filing this as a CR is heavy for a one-line copy edit; suggest folding into next sprint's housekeeping wave or even a wiki-only correction.

2. **Flashcard candidate:** The `sandbox-paths-declared` §-number bug Dev caught (was §2, should be §3) is the third instance this sprint of "predicate references the wrong section index because the template's section numbering changed since the predicate was authored." Worth a flashcard tag like `#predicate #section-numbering #template-drift`.

3. **BUG-026 test-file convention (low priority):** If `test/scripts/test_update_state.*` is the canonical home for state-script tests by convention, move the 2 BUG-026 regression scenarios out of `readiness-predicates.test.ts`. Defer unless convention is enforced elsewhere.

4. **Mirror sync timing for CR-037 (informational):** The live `.claude/agents/architect.md` at repo root was hand-synced ahead of `sprint/S-21` merge to main, which is correct per Dogfood split protocol. After merge, re-confirm by running the literal `diff` from repo root — the prompt's check will then return empty.

---

## Flashcards flagged

- `2026-05-03 · #predicate #section-numbering · CR-034 caught sandbox-paths-declared §2→§3 mismatch — predicate-section indexes drift when templates reorder; verify before migration.`
- `2026-05-03 · #predicate #spec-defect · CR-034 §4.2 "≤2 listed-item" assertion contradicts §3 migration scope (6 named criteria, proposal gates excluded). Always cite the named migration set, not aggregate counts.`
- `2026-05-03 · #worktree #test-paths · vitest fixtures with hardcoded /Users/ssuladze/...ClearGate paths break in sprint worktrees. Use SMOKE_REPO_ROOT pattern (resolve via import.meta.url).`

---

```
ARCH: PASS
HOT_FILE_ORDER: ok
MIRROR_PARITY: ok
COVERAGE: CR-031=5/≥5, CR-034=9/≥8, BUG-026=2/≥1, CR-037=manual-smoke
flashcards_flagged: [#predicate #section-numbering, #predicate #spec-defect, #worktree #test-paths]
```

role: architect

# CR-033 Architect Post-Flight Review

**Story:** CR-033 — Reuse-audit verifies cited surfaces exist
**Wave:** SPRINT-21 W3
**Commit:** `17e2e33` on `story/CR-033`
**Worktree:** `.worktrees/CR-033`
**Date:** 2026-05-04
**Reviewer:** Architect (post-flight; M3 plan author)

---

## Verdict

ARCH: PASS. Implementation conforms to the M3 plan §"CR-033 — `existing-surfaces-verified` predicate" precisely — 4 hunks in the four designated free zones, 4 documentation edits in `readiness-gates.md` × 2 mirror ends, 9 test scenarios in a single new `describe` block, no touches in CR-031 / CR-034 protected regions. Sandbox substitution is the correct workaround for the §0.5 Q1 permissive-regex consequence and was already noted in the plan's Gotchas section.

---

## Review Findings

### 1. Free-Zone Compliance — PASS

All four hunks in `cleargate-cli/src/lib/readiness-predicates.ts` land in the free zones the M3 plan designated:

| Hunk | Plan-designated zone | Actual diff position | Status |
|---|---|---|---|
| 1 | After L19 — union member append | `@@ -16,7 +16,8 @@` adds `\| { kind: 'existing-surfaces-verified' }` as final union member; pushes terminal `;` from L19 → L20 | ok |
| 2 | After L113, before L115 — parser case before throw | `@@ -112,6 +113,11 @@` inserts case 7 inside `parsePredicate()` between the `status-of` return and the throw | ok |
| 3 | In switch L155–158 — dispatch arm | `@@ -155,6 +161,8 @@` adds `case 'existing-surfaces-verified': return evalExistingSurfacesVerified(doc, projectRoot);` inside the `evaluate()` switch | ok |
| 4 | After file tail L677 — evaluator function append | `@@ -675,3 +683,103 @@` appends `evalExistingSurfacesVerified()` (~100 LOC including comments) | ok |

**CR-031 protected region (L273–299, `resolveLinkedPath` body):** untouched. Verified by reading the four `@@` headers — none overlap that span.

**CR-034 protected regions (L16 declared-item literal in `section` union member, L80 / L86 parser `declared-item` enum, L494–495 dispatch, L516–569 `countDeclaredItems`):** untouched. Hunk 1 inserts at union-member level *after* L19, leaving L16's section-member literal intact. Hunk 3 inserts a top-level `case` in the outer `evaluate()` switch (around L161), not the inner `section`-handler switch where CR-034's `declared-item` lives. Hunks 2 and 4 are far below CR-034's L80/L86 and far above L516–569 respectively.

No collisions surfaced.

### 2. Documentation Drift Fix — PASS

`.cleargate/knowledge/readiness-gates.md` L9 changed from "exactly **6 predicate shapes**" → "exactly **7 predicate shapes**". Confirmed in the diff at the first `@@` hunk of the readiness-gates file. The new vocabulary entry `**7. existing-surfaces-verified**` was appended after the existing `**6. status-of(...)**` block at L33+ as the M3 plan specified.

The three gate-criterion inserts (epic.ready-for-decomposition, story.ready-for-execution, cr.ready-to-apply) all land *immediately after* the `reuse-audit-recorded` line in their respective gate blocks, matching the M3 §"Insert 1/2/3" lines exactly. Indentation (4 spaces) matches surrounding criteria — no YAML lint issues.

### 3. Mirror Parity — PASS

`diff .cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` exits 0 (byte-equal). Confirmed in worktree. The commit's diff for both files is identical (same four hunks at same line numbers). MANIFEST.json regeneration via `npm run prebuild` (pretest hook) updated the SHA entry for `readiness-gates.md` correctly.

No drift between live and canonical mirror.

### 4. Sandbox Regex Behavior — PASS (with note)

Dev's substitution of the spec's `../../etc/passwd` example with `../../etc/shadow.conf` in test scenario 8 is **correct**. The permissive path-extraction regex `/[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5}(?::[a-zA-Z_][a-zA-Z0-9_]*)?/g` requires a file extension via the `\.[a-zA-Z]{1,5}` anchor — `passwd` has no extension and is silently skipped by the regex, which causes the test to fall through to the "zero paths + no sentinel" branch instead of exercising the sandbox-rejection branch the test name promises. Substituting `shadow.conf` (extension present) routes the path through the regex, then through `path.resolve` + the sandbox check, then to the "missing" bucket per CR-033 §1 step 4 — which is the intended security path.

This is the **accepted permissive trade-off** the Architect chose at CR-033 §0.5 Q1 (resolved as "permissive matching + existence filter, not strict format enforcement"). The M3 plan's Gotcha entry on this exact behavior already flagged it: *"the existence check itself filters false positives — `e.g` does not exist as a file, so the criterion fails with detail naming `e.g`. Per CR-033 §0.5 Q1 resolution this is the accepted permissive trade-off."*

The M3 plan's spec for scenario 8 read literally — `../../etc/passwd` would have produced the same FAIL verdict but via the wrong code path. Dev's substitution exercises the actual sandbox-rejection logic, which is the correct test intent. Both `passwd` and `shadow.conf` end at `pass: false`; only `shadow.conf` proves the sandbox check fires. Acceptable.

The evaluator's inline comment block (predicate file L688–700) explicitly documents this trade-off — future maintainers will see why the regex is permissive without re-reading CR-033 §0.5.

### 5. Test Count — PASS

9 scenarios per spec (CR-033 §3), 9 `it()` blocks in the new `describe('CR-033 existing-surfaces-verified — L0 code-truth tightening')` block at test file L470–589. Verified. Mapping:

| Spec scenario | Test it() | Status |
|---|---|---|
| 1. Section absent → not-applicable | "Section absent → not-applicable (pass with skip detail)" | covered |
| 2. cites `package.json` → pass | "Section present, cites package.json (real top-level file) → pass" | covered |
| 3. real path with `:symbol` → pass; symbol stripped | "Section present, cites …work-item-type.ts:detectWorkItemTypeFromFm → pass; symbol stripped" | covered |
| 4. missing file → fail; detail names path | "Section present, cites …does-not-exist.ts → fail; detail names path" | covered |
| 5. mix real + missing → fail; only missing in detail | "mix of real + missing paths → fail; detail names only missing" | covered |
| 6. no paths + sentinel → pass | "no path matches, contains \"no overlap found\" sentinel → pass" | covered |
| 7. no paths + no sentinel → fail | "no path matches, no sentinel → fail with sentinel-missing detail" | covered |
| 8. `../../etc/...` traversal → fail | "cites path traversing outside root → sandbox-rejected, treated as missing → fail" | covered (with `shadow.conf` substitution; acceptable per §4 above) |
| 9. real subdir file → pass | "cites cleargate-cli/package.json (real subdir file) → pass" | covered |

Total `it()` blocks in `readiness-predicates.test.ts`: 89 (post-CR-033). Targeted run reports 89 passed, 0 failed per QA report L31 — matches the count.

### 6. Pre-Existing Failures — PASS

QA's full-suite delta (1602 passed, 24 failed) attributes all 24 failures to four structural categories: (a) `.svelte-kit/` build artifacts absent in worktrees, (b) `.claude/hooks/pre-tool-use-task.sh` gitignored and absent in worktree, (c) `mcp/package.json` from nested git repo not present in worktrees, (d) live-asset reads of gitignored `.claude/agents/*.md` files. None of these are attributable to CR-033's surface (`readiness-predicates.ts` + `readiness-gates.md` + 9 test scenarios). Spot-check: `gate.test.ts:638`'s `toHaveLength(6)` assertion was already stale because the Sprint gate added pre-W3 made the live count 7; CR-033 did not modify `gate.test.ts`. No regressions introduced.

### 7. Plan Conformance — PASS (notes only)

Implementation matches M3 plan blueprint sketch step-for-step:
- ✓ Step 1: 4 disjoint hunks at L19+ / L113+ / L156+ / L677+ (actual: L19 / L113 / L161 / L683 — line-shifts from earlier hunks but the relative positions are correct).
- ✓ Step 2: 4 hunks each in live + canonical readiness-gates.md (predicate count L9, predicate vocab L33+, 3 gate criterion inserts).
- ✓ Step 3: 9 test scenarios in a single new describe block.
- ✓ Step 4: `npm run prebuild` ran via pretest hook; MANIFEST.json updated.

The evaluator implementation reuses the exact patterns the M3 plan specified for reuse:
- ✓ Body-split via `body.split(/^(?=## )/m)` matching `evalSection`'s pattern (predicate file L703).
- ✓ Sandbox check `resolved.startsWith(projectRoot + path.sep) || resolved === projectRoot` matching `evalFileExists`'s pattern (predicate file L770).
- ✓ Reuse of `fs.existsSync`, `path.resolve`, no new imports introduced.
- ✓ `reuse-audit-recorded` predicate untouched (still `body contains '## Existing Surfaces'`).

The literal `## Existing Surfaces` section locator (no number prefix) matches the M3 plan's gotcha entry citing FLASHCARD `2026-05-02 #qa #templates #readiness · CR-028`. No drift from the heading-format contract.

---

## Open Items / Follow-Ups

1. **Initiative-gate exemption is structural, not enforced.** As the M3 plan flagged in §"Gotchas", CR-033 cannot prevent a future maintainer from adding `existing-surfaces-verified` to the (yet-to-merge) Initiative gate that CR-030 introduces. The exemption depends on CR-030's final gate definition having only 3 criteria (`no-tbds`, `user-flow-populated`, `success-criteria-populated`). Verify post-CR-030 merge that no `existing-surfaces-verified` criterion was accidentally added to the Initiative gate block. **Action for orchestrator:** include this in W3 final-merge QA spot-check.

2. **AC1 + AC8 deferred per spec.** AC1 (bug reproduces pre-CR against EPIC-002 fabricated surfaces) and AC8 (end-to-end smoke) are manual acceptance criteria deferred to W4+W5 close per CR-033 §4. No blocker for W3 merge; document in REPORT.md at sprint close.

3. **Commit message format.** Commit subject is `feat(SPRINT-21):` not `feat(<epic>):`. CLAUDE.md DoD prescribes `feat(<epic>): STORY-NNN-NN <desc>` but SPRINT-21's W-bundle commits already established the `feat(SPRINT-21-WN):` / `feat(SPRINT-21):` pattern. Not blocking; consistent with prior W3 commits in this sprint.

---

## Flashcards Flagged

The M3 plan emitted the following flashcard candidates for CR-033 work; recommend the Reporter cite them at sprint close:

- `#predicates #existing-surfaces · existing-surfaces-verified regex matches prose-shaped strings (e.g. 'e.g.'); existence check filters false positives but error detail will name them — accepted per CR-033 §0.5 Q1.`
- `#predicates #regex #file-extension · path-extraction regex requires file extension via \.[a-zA-Z]{1,5} — extensionless paths like /etc/passwd are silently skipped by the regex; sandbox check only fires on extension-bearing paths.` (NEW — surfaced by Dev's scenario-8 substitution.)
- `#mirror #readiness-gates · readiness-gates.md has TWO mirror ends (.cleargate/knowledge/ + cleargate-planning/.cleargate/knowledge/) — every CR adding a new criterion must edit BOTH; npm run prebuild does NOT mirror this file (verified pretest does not regenerate readiness-gates.md content, only MANIFEST.json SHA).`

---

## Return Format

```
ARCH: PASS
FREE_ZONE_COMPLIANCE: ok
DRIFT_FIX: ok
MIRROR_PARITY: ok
flashcards_flagged: [#predicates #existing-surfaces, #predicates #regex #file-extension, #mirror #readiness-gates]
```

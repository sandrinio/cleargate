---
story_id: STORY-043-05
agent: architect
mode: post-flight-review
verdict: PASS
generated_at: 2026-06-01T13:00:00Z
---

role: architect

# Architect Post-Flight Review — STORY-043-05 (close hardening + reporter v2 + flashcard curation)

HIGH-EXPOSURE / LIVE-LOOP review. The edited `.cleargate/scripts/close_sprint.mjs` becomes the ACTIVE
script for SPRINT-33's own Gate-4 close, so the dist-assertion was traced empirically (sandboxed runs only;
real SPRINT-33 state.json untouched — `sprint_status` confirmed still `"Active"` post-review).

## 1. LIVE-LOOP SAFETY (highest priority) — PASS

Dist-assertion at `close_sprint.mjs:301-320`. Traced both branches empirically in a sandbox:

- **(a) FIRES when dist genuinely ABSENT + no skip seam:** With `CLEARGATE_REPO_ROOT=<tmpdir>` (no dist
  there) and no `CLEARGATE_SKIP_LIFECYCLE_CHECK`, the run printed "Step 1-2 passed" then exited **1** with the
  clear message `dist not built — run \`npm run build\` in cleargate-cli/` + expected path + gate-list rationale.
- **(b) Clean NO-OP when dist PRESENT:** real `cleargate-cli/dist/cli.js` exists (10 379 330 B, built Jun 1 12:19).
  In a healthy-close trace with the REAL repo root (no `CLEARGATE_REPO_ROOT` override → `REPO_ROOT` = real repo
  → `cliBinEarly` resolves to the present 10 MB dist → `fs.existsSync` true), NO "dist not built" line was
  emitted — the assertion was a pure pass-through. It cannot abort a healthy close.
- **Placement BEFORE the cascade:** the block sits at L301, strictly between "Step 2.5 passed" (L298) and
  "Step 2.6: running lifecycle reconciliation" (L328). The gates do not half-run then abort — the assertion
  is the first thing after Step 2.5 and before any cascade step's side effects.

Conclusion: SPRINT-33's own Gate-4 close (real dist present, no skip env) proceeds Steps 2.6 → 2.8 → Gate-4
exactly as before. The assertion only changes behavior in the genuinely-broken-build case, where loud failure
is the correct outcome.

## 2. CLEARGATE_SKIP_* SEAM INTERACTION — PASS

The assertion is gated behind `process.env.CLEARGATE_SKIP_LIFECYCLE_CHECK !== '1'` (L310). Traced: with the
skip seam set (+ dist absent), the run printed "Step 2.6 skipped … (test seam)" / "Step 2.6b skipped …" and
fell straight through to "Step 5: flipping sprint_status" with NO "dist not built" line. This is coherent:
the seam that skips the lifecycle cascade also skips that cascade's dist prerequisite — skip the check, skip
its precondition. Production close sets none of the `CLEARGATE_SKIP_*` env vars, so production is NOT
accidentally bypassing the assertion (confirmed by the (a)/(b) traces above — the assertion is live whenever
the seam is unset).

## 3. CASCADE-ONCE (no duplicate pass) — PASS (independently verified)

Each cascade block's terminal/block site appears exactly once and ALL precede the assumeAck gate:
- Step 2.6 FAILED — L368
- Step 2.6b FAILED — L415
- Step 2.6c HALT — L499
- Step 2.7 failed — L618
- Step 2.8 failed — L693
- assumeAck gate (`} else if (!assumeAck) {`) — L784; `reportBodyStdin` stdin-mode branch — L760

No cascade step is re-invoked after L784. The cascade runs once unconditionally before the ack gate; the
`--assume-ack` path only governs whether the script halts-for-review (L784-800) vs proceeds to Step 5 (L802).
No duplicate cascade was missed. Matches dev+QA finding.

## 4. REPORTER v2 COHERENCE — PASS

`cleargate-planning/.claude/agents/reporter.md` diff (canonical) is internally consistent:
- `template_version: 1 → 2` (frontmatter requirement line).
- "all six sections (§§1-6)" → "all seven sections (§§1-7)" (one-job line).
- Synthesize block: "§§1-6 in order" → "§§1-7 in order"; §4 Observe inserted (signal log + flashcard archival
  candidates); §5 Lessons / §6 Self-Assessment / §7 Change Log each carry an explicit
  "(Re-numbered from §N in template_version 2.)" annotation.
- Guardrail line: "All six sections required. §§1-6" → "All seven sections required. §§1-7".
- No dangling cross-reference to old numbers: grepped the whole non-archive tree for `§§1-6 / six sections /
  All six` in canonical reporter.md — zero residual hits. The "§5b" stale-detection reference in the §4 prose
  is correct (it points at the reporter's own step-5 grep procedure, not a section renumber).
- The template `.cleargate/templates/sprint_report.md` already carries the matching 7-section structure
  (§1 Delivered, §2 Story Results, §3 Metrics, §4 Observe Phase Findings, §5 Lessons,
  §6 Framework Self-Assessment, §7 Change Log) at `template_version: 2` — reporter.md is now aligned with it.

## 5. FLASHCARD SKILL Rule 9 + Cold Archive — PASS

`cleargate-planning/.claude/skills/flashcard/SKILL.md`:
- Rule 9 added: "Curation is review-driven, not age-based" — explicitly states nothing is auto-evicted/deleted
  on time; cards become archival candidates ONLY on human review (superseded / resolved / duplicate).
- "Cold Archive" section: documents `.cleargate/FLASHCARD-archive.md` as greppable cold file; two-step,
  human-approved-at-Gate-4 flow (Reporter surfaces in §4 Observe → human approves → body moved, `[S]`/`[R]`
  marker applied in live file). "Never delete entries from the archive."
- Coherent with existing Rules 6-8: Rule 6 (append-only `[S]`/`[R]` markers, original text preserved),
  Rule 7 (reporter flags, human approves batch), Rule 8 (check-mode filter for `[S]`/`[R]`). Rule 9 + Cold
  Archive extend that model (archival = move-to-cold-file + same `[S]`/`[R]` marker); no contradiction with the
  append-only / no-auto-evict invariants.

## 6. MIRROR + SCOPE — PASS

- `close_sprint.mjs`: working `.cleargate/scripts/` IDENTICAL to canonical `cleargate-planning/.cleargate/scripts/`
  (`diff -q` → IDENTICAL).
- Diff scope vs HEAD: exactly 4 outer files — `.cleargate/scripts/close_sprint.mjs` (+21),
  `cleargate-planning/.cleargate/scripts/close_sprint.mjs` (+21), `cleargate-planning/.claude/agents/reporter.md`
  (+23/-7 net wording), `cleargate-planning/.claude/skills/flashcard/SKILL.md` (+10). Plus the cleargate-cli red
  test `close-sprint-hardening-043-05.red.node.test.ts` (in cleargate-cli's own gitignored repo).
- No `cleargate-cli/src/**` change. No production-code change.
- Live `.claude/agents/reporter.md` still v1 (six/§§1-6/template_version: 1) and live SKILL.md has no Rule 9
  (0 hits) — DEFERRED to Gate-4 `cleargate init` re-sync, correct per dispatch.

## 7. G-SWEEP (the EPIC-024-style hidden-count check) — PASS

Grepped for every hardcoded count/section guard the renumber could break, then ran the plausibly-affected
suites:
- `close-sprint-hardening-043-05.red.node.test.ts`: **16/16 PASS** (S2 cascade-once, S3a-d reporter v2,
  S4a-c flashcard cold-archive, S5a-c canonical source-of-truth).
- `reporter-content.node.test.ts`: **15/15 PASS** — including Scenario 6 "Capability Surface + Post-Output
  Brief sections byte-identical between live and canonical" (those sections were untouched, so live-vs-canonical
  parity on THEM holds; this test does NOT assert on the §4-§7 body, so the deferred live re-sync does not
  red it).
- `test_close_sprint_v21.node.test.ts`: **80/81** — the single fail is Scenario 24 `CAND-SPRINT-TEST-S`
  skill-candidate, PRE-EXISTING (skill-candidate scan logic untouched by this story; matches QA's confirmed
  pre-existing fail #1). The v21 §3-metric and Lane/Hotfix-Audit assertions (L270-295) are content-string
  matches (`/Lane Audit/`, `/Fast-Track Ratio/`, …) that the v2 reporter preserves verbatim — NOT broken.
- `close_sprint.mjs` Step 2.5 validation regexes (`/Lane Audit/`, `/Hotfix Audit/`, `/Hotfix Trend/`) are
  content-anchored, not section-number-anchored — they match anywhere in the report, so the §5→§6 relocation
  of those subsections in the v2 template does NOT break Step 2.5. (See note G1 below — cosmetic label drift only.)

### Non-blocking observations (no GATE-4 action required, future hygiene)

- **G1 (cosmetic, non-blocking):** `close_sprint.mjs:284` comment says "Check required §5 sections" and L293
  emits "§5 missing:" — but in the v2 `sprint_report.md` template the Lane Audit / Hotfix Audit / Hotfix Trend
  subsections now live under §6 Framework Self-Assessment, and §5 is now Lessons. The validation REGEXES are
  content-based and still match correctly (no functional break), but the comment + error LABEL are stale ("§5"
  should read "§6"). This pre-dates STORY-043-05 (the template already shipped at v2 with §6 holding these);
  the reporter.md renumber merely made the mismatch more visible. Worth a one-line fix in a future close-pipeline
  touch — not in scope here, and does not affect the SPRINT-33 close.

## Conclusion

Structurally correct. The dist-assertion is fail-closed when the build is broken and a verified no-op when the
build is present (which it is) — it cannot abort SPRINT-33's healthy Gate-4 close. Skip-seam interaction is
coherent. Cascade runs once. Reporter v2 renumber and flashcard cold-archive are internally consistent with no
dangling references. Mirror byte-identical; scope clean. No hidden count/snapshot guard broken by the renumber.

---

ARCH-POSTFLIGHT: PASS
ISSUES: none blocking. Non-blocking G1: close_sprint.mjs:284/293 comment+error-label say "§5" for the Lane/Hotfix-Audit validation, but those subsections live under §6 in the v2 template (regexes are content-based, so no functional break; pre-existing, stale label only — fix in a future close-pipeline touch).
GATE4_NOTES:
  - Live re-sync (deferred, REQUIRED at Gate-4): run `npm run prebuild` (mirrors canonical → cleargate-cli/templates payload) then `cleargate init` from repo root to rewrite live `/.claude/agents/reporter.md` + `/.claude/skills/flashcard/SKILL.md` from the v2 canonical. Live currently still v1 (six/§§1-6/template_version: 1) + no Rule 9 — confirmed by grep. This is correct deferral per dispatch, NOT a defect; must execute before/at close.
  - Dist gate-check parity (already queued): the new fail-closed dist assertion is mirrored canonical==working; ensure the same WS8(e) block is present in any gate-check/doctor surface that pre-validates close readiness, so the loud-fail-on-stale-dist behavior is consistent across entry points.
flashcards_flagged: ["2026-06-01 · #close-pipeline #dist #live-loop · close_sprint WS8(e) dist fail-closed assertion fires only when cleargate-cli/dist/cli.js ABSENT and CLEARGATE_SKIP_LIFECYCLE_CHECK!=1; clean no-op when dist present so a healthy close is never aborted; placed before Step 2.6 so the cascade can't half-run", "2026-06-01 · #close-pipeline #section-numbering · close_sprint.mjs Step 2.5 '§5 missing' label is stale — Lane/Hotfix-Audit moved to §6 (Framework Self-Assessment) in sprint_report v2; the validation regexes are content-based so they still match, label only"]

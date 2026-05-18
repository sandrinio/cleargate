---
role: architect
mode: POST-FLIGHT
story_id: STORY-066-02
sprint_id: SPRINT-28
dev_commit: 7fba2e5b
qa_red_commit: 2c1620c3
verdict: PASS
emitted_at: 2026-05-18
---

# Architect Post-Flight — STORY-066-02

## Verdict

`ARCHITECT: PASS`

Wave 2 Thread A (CR-066 Phase B) is structurally clean. Step 2.6c is wired in both `close_sprint.mjs` copies byte-identical, `--parents` audit reaches the audit-table emitter in `commands/sprint.ts` via the new `cli.ts:355` option, MANIFEST sha256 catalog refreshed to `0881ee88...` for the script's new content, and dist/ ships `walkActiveParents`. QA-Verify is sound (15/15 Red, 5/5 Gherkin, mirror parity diff returns empty). No structural defects, no plan deviations beyond the two orchestrator-confirmed ones, no spec drift between M1 §STORY-066-02 and shipped code.

## Review Points (per dispatch brief)

### 1. Plan deviations (orchestrator-confirmed)

Both deviations confirmed correctly applied. Reasoning is sound:

- **SCRIPTS_DIR-relative import path** (close_sprint.mjs line ~440 `path.resolve(SCRIPTS_DIR, '..', '..')`) — fixture tests set `CLEARGATE_REPO_ROOT` to a tmpdir, but the BUILT dist always lives at the actual repo root. Using REPO_ROOT for the dist import would fail in tests because the tmpdir has no `cleargate-cli/dist/`. The SCRIPTS_DIR approach correctly decouples "where do I read fixtures from" (REPO_ROOT) vs "where do I find the compiled walker" (the script's own location). This is the right invariant: dist is repo-truth, fixtures are tmpdir-truth.
- **`[${verdict}]` halt prefix** (`  - [${h.verdict}] ${h.halt_reason}`) — Red test Scenario 4 asserts `halt-zero-children` as a substring; with the prefix it appears literally. Without the prefix, the halt_reason ALREADY contains the verdict in its prose (e.g. "EPIC-FXTRB: 7/8 children terminal..." — but the verdict word itself doesn't appear in `halt-partial` prose, only in `halt-zero-children` prose). The bracket prefix is the safer assertion seam; structural cost is negligible.

Both deviations are PLAN-COMPATIBLE — no Amendment needed.

### 2. Step 2.6c semantics — block on any halt, no opt-out

**Confirmed intended per CR-066.** Dispatch brief asks whether non-zero exit on ANY halt (halt-partial OR halt-zero-children) is intended for STORY-028-01's dogfood pass against the 6 stale Epics.

**Answer: yes.** Per CR-066 §1.2 + M1 plan §STORY-066-01 scenario 3: "halt-zero-children" verdict halt_reason ends `"0 children drafted; not reconcilable — decompose or abandon"`. This is the exact semantic STORY-028-01 needs to discover. The dogfood will exit 1 against the current `pending-sync/` state because EPIC-021 (zero-children — known per M1 plan §STORY-066-01 scenario 3 example) and other stale Epics will trip halt. The exit-1 is the SIGNAL that drives the harvest pass — STORY-028-01 reads the HALT block, decides per-Epic action (decompose, abandon, complete), then re-runs.

**No `--no-strict` opt-out is correct.** Adding one would defeat CR-066's stated reform: "stale parent frontmatter cannot accumulate." If the user wants read-only audit (without exit-1 propagation), they have it via `cleargate sprint reconcile-lifecycle --parents` (always exit 0 by design — see review point #4).

### 3. Mirror parity discipline

**Confirmed sustainable for now; flag for SPRINT-29 backlog.** Both copies are byte-identical (just re-verified live: `[ok] Files are identical`). MANIFEST sha256 refreshed correctly.

**Sustainability concern (advisory, not blocking):** This is the 4th piece of script logic that lives in two copies (Step 2.6, 2.6b, 2.6c, atomic-helpers). Mirror parity QA-gate works *if* every author remembers to edit both. FLASHCARD 2026-05-04 `#mirror #parity` exists exactly because someone forgot. Recommend SPRINT-29 backlog item: extract close_sprint.mjs into a shared module under `cleargate-cli/scripts/` and have `cleargate-planning/.cleargate/scripts/close_sprint.mjs` become a 5-line shim that re-invokes it. Out of scope for STORY-066-02 — flagging only.

### 4. `--parents` read-only audit exit semantics

**Confirmed correct — exit 0 regardless of halts.** Verified at `commands/sprint.ts:411` (`exitFn(0)` after audit-table print) and `cli.ts:355` (`--parents` registered as a boolean option on the `reconcile-lifecycle` subcommand).

STORY-028-01 will use `--parents` for the read-only harvest pass first (audit-only, exit 0, surfaces the 6 stale Epics for human triage), THEN invoke `close_sprint.mjs` against a sentinel sprint to commit the auto-flips (Step 2.6c, exits 1 on remaining halts after each pass). Two-phase pattern per M1 plan §"Open decisions" #1.

One subtle detail in the implementation: `commands/sprint.ts:386-389` says `if (!opts.parents) return exitFn(1);` inside the drift-detected branch. This means if `--parents` is set AND drift is detected, the function DOESN'T early-exit — it falls through to the audit. That's correct: `--parents` overrides the drift-exit so the audit gets to print. STORY-028-01's harvest pass would see both the drift listing AND the parent audit in one invocation. Good wiring.

### 5. dist/cli.js dependency for `--parents`

**Confirmed: STORY-028-01 dogfood prereq is `npm run build` in `cleargate-cli/`.** Live dist/ checked: `cleargate-cli/dist/lib/lifecycle-reconcile.js` exists, exports `walkActiveParents` (2 references in compiled JS).

**Orchestrator action for Wave 3:** Before launching STORY-028-01, run `cd cleargate-cli && npm run build` to ensure dist/ is fresh against the just-merged Wave 2 changes. The defensive `typeof reconcilerMod26c.walkActiveParents !== 'function'` guard at close_sprint.mjs line ~446 will gracefully degrade if dist is stale ("Step 2.6c skipped: walkActiveParents not in built CLI — rebuild cleargate-cli/."), but the dogfood would not exercise the actual logic. Pre-gate runner already runs `npm run build`, but the dist/ file is gitignored — fresh build per session is mandatory.

### 6. Cross-cutting (Thread A + Thread B foundations both live)

**Confirmed.** STORY-066-02 + STORY-067-02 are both on `sprint/S-28` branch (commits `7fba2e5b` and prior). STORY-028-01 dogfood (Wave 3) will exercise both:
- CR-066 Step 2.6c rolls up parent status against 114-flip-stable archive (post-067-02).
- CR-067's `Completed`-only vocabulary means the rollup terminal-check at `parent-rollup.ts` (via ARTIFACT_TERMINAL_STATUSES) reads a stable, vocabulary-normalized archive.

The two threads compose cleanly because (a) Phase B of CR-067 already flipped all archive items to `Completed`, and (b) CR-066's parent-rollup library reads through ARTIFACT_TERMINAL_STATUSES (8-element tolerant set per FLASHCARD on lifecycle-reconcile.ts:27-36 — STORY-067-03 tightens this in SPRINT-29 prep). So STORY-028-01 sees a vocabulary-clean archive AND a parent-rollup walker that handles both pre- and post-tightening states. No race condition between threads.

## Plan Compliance Audit

| M1 plan claim | Verified |
|---|---|
| Step 2.6c inserts after line 407 (end of 2.6b) | YES — close_sprint.mjs:410 starts the new block |
| Mirror parity: byte-identical | YES — diff returns empty (just re-verified live) |
| `setFrontmatterStatusAtomic` raw-bytes regex (no parse/serialize) | YES — close_sprint.mjs:425-434, matches FLASHCARD 2026-04-24 pattern |
| Defensive guard for stale dist/ | YES — `typeof reconcilerMod26c.walkActiveParents !== 'function'` |
| `--parents` exits 0 regardless of halts | YES — `commands/sprint.ts:411` exitFn(0) |
| MANIFEST.json sha256 refreshed for mirror script | YES — `0881ee88...` (commit diff line 200) |
| No `--apply` flag added to `--parents` | YES — Out of Scope per story §1.3 honored |
| Defensive guard message names rebuild target | YES — "rebuild cleargate-cli/." |

## Cross-Story Risks for Wave 3 Dispatch

1. **STORY-028-01 dispatch must include `npm run build` step.** Without fresh dist, defensive guard degrades the dogfood to a no-op. Orchestrator: include in Wave 3 dispatch brief — `cd cleargate-cli && npm run build && npm run typecheck` BEFORE invoking close_sprint.mjs against the sentinel.

2. **STORY-028-01 must use `--parents` (audit-only) BEFORE close_sprint.mjs (apply).** Audit-first lets the human triage the 6 stale Epics before commit happens. Two-phase invocation is the safe pattern per the story's Recommended option in §1.4.

3. **STORY-067-03 will tighten ARTIFACT_TERMINAL_STATUSES from 8 to 1 element.** Once tightened (SPRINT-29 prep), parent-rollup.ts must re-test against the new set. STORY-066-02's walker is forward-compatible (reads through the constant, doesn't redefine), but Wave 3 / SPRINT-29 should re-verify with a smoke test against the tightened constant. Not blocking for SPRINT-28 close.

## FLASHCARD Recommendation

Not authored — none of the surprises rise to flashcard threshold (all anticipated by M1 plan or QA-Verify report). The `[verdict]` prefix and SCRIPTS_DIR import-path patterns are sufficiently spec'd in M1 plan + this report.

## Script Incidents

None.

## Mid-Sprint Amendments

To append to `sprint-context.md` `## Mid-Sprint Amendments` section:

```
2026-05-18T00:00:00.000Z · STORY-066-02-arch · Architect post-flight (PASS). CR-066 Phase B foundations clean: Step 2.6c block-mode + `--parents` audit-only flag both wired, mirror parity byte-clean, MANIFEST sha256 refreshed. Three advisory items for Wave 3: (1) STORY-028-01 dispatch MUST run `cd cleargate-cli && npm run build` before invoking close_sprint.mjs — defensive guard at close_sprint.mjs:446 degrades to no-op on stale dist; (2) STORY-028-01 should run `--parents` audit-only first (exit 0), then close_sprint.mjs (block on halts) — two-phase harvest is the safe pattern; (3) SPRINT-29 backlog item recommended: extract close_sprint.mjs to a single shared module so cleargate-planning mirror becomes a 5-line shim (4th piece of script logic now duplicated; mirror parity QA-gate fragile). STORY-067-03 forward-compat note: parent-rollup.ts reads ARTIFACT_TERMINAL_STATUSES through lifecycle-reconcile.ts:27, so tightening from 8-element to 1-element set in SPRINT-29 is safe — just re-verify with a smoke test.
```

## Adjacent Implementations Table (post-merge update)

Add to `sprint-context.md` `## Adjacent Implementations (Reuse First)` table:

```
| STORY-066-02 | Step 2.6c parent rollup at close (block on halt) + `cleargate sprint reconcile-lifecycle --parents` (audit-only, exit 0) + `setFrontmatterStatusAtomic` raw-bytes helper | .cleargate/scripts/close_sprint.mjs (+ canonical mirror) + cleargate-cli/src/commands/sprint.ts + cleargate-cli/src/cli.ts |
```

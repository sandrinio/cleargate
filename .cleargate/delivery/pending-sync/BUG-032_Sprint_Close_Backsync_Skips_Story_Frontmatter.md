---
bug_id: BUG-032
parent_ref: EPIC-021
parent_cleargate_id: "EPIC-021"
sprint_cleargate_id: SPRINT-30
carry_over: false
status: Triaged
severity: P1-High
reporter: sandrinio
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: scripts/close_sprint
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T05:17:12Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Discovered 2026-05-19 while reviewing pdf_processor's completion of
  its first two sprints. Confirmed in BOTH sprints:

  SPRINT-01 (pdf_processor):
    - state.json: all 9 stories `state: "Done"`, sprint_status: "Completed"
    - story files: 6 of 9 still `status: "Draft", approved: false`
    - SPRINT-01 + EPIC-001 + EPIC-002 + 6 stories still in pending-sync
      (never moved to archive)
    - No git commit references close_sprint.mjs run; the
      "sprint-close artifacts" commit only landed plans/reports
    - Workaround used: none — items just sit drifted

  SPRINT-02 (pdf_processor):
    - Proper close attempted: commit 97ccd32 "Gate-4 close — sprint
      Completed, items archived, .active cleared"
    - But: required a SEPARATE follow-up commit aa70962 "flip 13
      story + 2 epic frontmatter status → Completed" because the
      Gate-4 close DIDN'T flip the frontmatter automatically
    - Workaround used: manual frontmatter rewrite commit, 15 files

  Mechanism is supposed to exist:
    - close_sprint.mjs Step 2.6:  cleargate sprint reconcile-lifecycle
    - close_sprint.mjs Step 2.6b: auto-flip pending-sync items with
      non-terminal status whose state.json says state: Done
    - close_sprint.mjs Step 2.6c: roll up parent statuses

  Hypothesis on root cause:
    Step 2.6b's predicate likely filters on `approved: true` (or some
    similar pre-condition gate) BEFORE flipping. pdf_processor's 6
    dispatched stories never had `approved: true` set in frontmatter
    because they were drafted with `approved: false` and Gate-1 review
    happened only in chat (per the protocol-bypass we already
    documented). The auto-flip saw `approved: false` and skipped.

    For SPRINT-02, the 13 stories were likely properly approved=true,
    but Step 2.6b still didn't flip them — root cause TBD by reading
    the script.

  Either way the impact is the same: close_sprint.mjs is supposed to
  back-sync but in practice doesn't, forcing manual frontmatter rewrites.
stamp_error: no ledger rows for work_item_id BUG-032
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:36:02Z
  sessions: []
---

# BUG-032: `close_sprint.mjs` back-sync silently skips story frontmatter even when execution state says Done

## 0.5 Open Questions

- **Question:** Is the root cause (a) Step 2.6b predicate filters on `approved: true` and skips Draft stories, OR (b) the reconciler runs but writes to the wrong path / wrong file, OR (c) the back-sync runs but is silently overridden later in the close pipeline?
- **Recommended:** Read `close_sprint.mjs` Step 2.6/2.6b/2.6c against pdf_processor's SPRINT-02 logs to localize. Most likely (a) for SPRINT-01 (the 6 Draft stories case) and a different root cause for SPRINT-02 (where stories were properly approved but still didn't flip). May be two related bugs in one report.
- **Human decision:** _populated during Brief review_

- **Question:** Should the fix retroactively repair pdf_processor's SPRINT-01 leftovers (6 stuck stories + SPRINT-01 + EPIC-001 + EPIC-002 still in pending-sync)?
- **Recommended:** Out of scope for this BUG. pdf_processor's housekeeping is their concern; cleargate's job is to ensure future closes work. Include a one-shot CLI command `cleargate sprint reconcile-lifecycle <sprint-id> --retroactive` (if not already present) that lets users force a reconcile against a closed-but-drifted sprint — useful operator escape hatch.
- **Human decision:** _populated during Brief review_

- **Question:** Is there any case where Step 2.6b SHOULDN'T flip a story to Completed even when state.json says Done?
- **Recommended:** No legitimate case. If state.json says state: Done, the four-agent loop reports a passing QA + Architect post-flight. The story file MUST reflect that. If a human wants to override (e.g., reopen for follow-up), they can edit frontmatter back to Draft after the auto-flip; the auto-flip is the default-correct action.
- **Human decision:** _populated during Brief review_

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** When `close_sprint.mjs` runs Gate-4 close on a sprint, after Steps 2.6/2.6b/2.6c complete, EVERY story whose `state.json/stories/<id>/state === "Done"` MUST have its corresponding pending-sync story file's frontmatter rewritten:

```yaml
# Before
status: "Draft"
approved: false  # or true

# After (auto-flip by Step 2.6b)
status: "Completed"
approved: true
```

…and then the file moved from `.cleargate/delivery/pending-sync/` to `.cleargate/delivery/archive/` as part of the normal close-pipeline archive step.

**Actual Behavior:**

- **Case A — SPRINT-01 (pdf_processor):** 6 of 9 stories with `state: "Done"` in state.json still show `status: "Draft", approved: false` in their pending-sync frontmatter. Sprint marked Completed in state.json, but the items never archived.
- **Case B — SPRINT-02 (pdf_processor):** Gate-4 close ran (commit 97ccd32), items archived (we see them in archive/). But a separate follow-up commit aa70962 was required to flip 13 story + 2 epic frontmatter from Draft to Completed — proving Step 2.6b did NOT do the back-sync that the script claims it does.

## 2. Reproduction Protocol

Deterministic on any sprint with at least one story whose frontmatter `status` does not match its state.json `state`:

1. Create a fresh sprint, draft N stories, set 1 of them with `approved: false` (Draft).
2. Dispatch the four-agent loop, complete all stories (state.json marks all `state: "Done"`).
3. Run `node .cleargate/scripts/close_sprint.mjs <sprint-id> --assume-ack` (in a test sandbox where --assume-ack is acceptable).
4. **Observe:**
   - `cat .cleargate/delivery/pending-sync/STORY-NNN-NN.md | grep status` STILL says `status: "Draft"` for the un-approved story.
   - The story file is STILL in `pending-sync/`, never moved to `archive/`.
   - state.json correctly shows `state: "Done"` and `sprint_status: "Completed"`.
5. **Expected:** the story's frontmatter should now read `status: "Completed", approved: true` AND the file should be in `archive/`.

## 3. Evidence & Context

**pdf_processor SPRINT-02 commit chain** (the smoking gun — workaround commit `aa70962`):

```
aa70962 chore(SPRINT-02): flip 13 story + 2 epic frontmatter status → Completed
97ccd32 chore(SPRINT-02): Gate-4 close — sprint Completed, items archived, .active cleared
98d3f64 fix(SPRINT-02): walkthrough — SSE reconnect loop, CSS rebuild, inline JSON
6837b41 chore(SPRINT-02): per-story dev+qa reports + state.json + /runs gitignore
…
```

**pdf_processor SPRINT-01 drift snapshot (current)**:

```
$ ls .cleargate/delivery/pending-sync/
SPRINT-01_PDF_Core_Foundation.md            ← never archived
EPIC-001_Core_PDF_Engine.md                 ← never archived
EPIC-002_Faker_Mock_Data_Generator.md       ← never archived
STORY-001-04..06 (3 files)                  ← state.json Done, file Draft
STORY-002-01..03 (3 files)                  ← state.json Done, file Draft

$ grep '"sprint_status"\|"state"' .cleargate/sprint-runs/SPRINT-01/state.json
  "sprint_status": "Completed"
  (all 9 stories "state": "Done")

$ grep '^status:\|^approved:' .cleargate/delivery/pending-sync/STORY-001-04*.md
status: "Draft"
approved: false
```

**Script documentation that should be true** (`close_sprint.mjs:356-461`):

```js
// 356: Detect items in pending-sync/ with non-terminal status whose state.json entry says Done
// 413: auto-flip → rewrite status: Completed atomically, log one line.
// 461: setFrontmatterStatusAtomic(f.parent_path, 'Completed');
```

…but execution evidence proves this code path isn't reaching the 6 SPRINT-01 stories (or its predicate excludes them).

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate:**

- `.cleargate/scripts/close_sprint.mjs` — Steps 2.6 / 2.6b / 2.6c (line ~290-470). Specifically:
  - The predicate around line 356-380 that detects "items in pending-sync with non-terminal status whose state.json entry says Done."
  - The `auto-flip` branch around line 413-461.
  - Whether the predicate filters on `approved` field — if it does, that's the bug for SPRINT-01.
- `.cleargate/scripts/update_state.mjs` and `validate_state.mjs` — adjacent reconcile machinery.
- `cleargate-cli/src/commands/sprint.ts` `reconcile-lifecycle` subcommand — what the close script invokes.
- `.cleargate/sprint-runs/SPRINT-02/state.json` (pdf_processor) — has it as fixture for the "approved=true but still didn't flip" Case B.

**Do NOT touch:** the four-agent loop's `state: Done` writer. That's working correctly.

## 5. Verification Protocol (The Failing Test)

**Test 1 — back-sync flips Draft → Completed on Done stories:**

```ts
test('close_sprint Step 2.6b flips Draft stories to Completed when state.json Done', async () => {
  // Arrange:
  //   - fixture sprint dir with state.json: state: Done, sprint_status: Active
  //   - fixture story file in pending-sync/: status: Draft, approved: false
  //
  // Act: run close_sprint.mjs <sprint-id> --assume-ack against fixture
  //
  // Assert:
  //   - story file frontmatter: status: "Completed", approved: true
  //   - story file moved to archive/
});
```

**Test 2 — back-sync flips Approved → Completed on Done stories (SPRINT-02 case):**

```ts
test('close_sprint Step 2.6b flips Approved stories to Completed when state.json Done', async () => {
  // Same as Test 1 but story frontmatter starts with approved: true, status: "Approved"
  // Assert post-close: status: "Completed", file in archive/
});
```

**Test 3 — back-sync doesn't touch stories with state.json non-Done state:**

```ts
test('close_sprint Step 2.6b leaves Draft stories alone when state.json says non-Done', async () => {
  // Arrange: state.json state: "Ready to Bounce" or similar
  // Act: close
  // Assert: story file unchanged, halt with proper error since non-terminal state
});
```

**Test 4 — retroactive reconcile CLI command works:**

```ts
test('cleargate sprint reconcile-lifecycle --retroactive flips post-close drifted stories', async () => {
  // Arrange: closed sprint with drifted story file (mimics SPRINT-01 leftovers)
  // Act: invoke retroactive reconcile
  // Assert: story flipped to Completed, file moved to archive
});
```

**Command:** `cd cleargate-cli && npm test -- --grep close_sprint`

**Manual verification against pdf_processor SPRINT-01:**
1. On the bug-fix branch, copy `.cleargate/sprint-runs/SPRINT-01/state.json` + the 6 drifted story files into a test sandbox.
2. Run the retroactive reconcile CLI.
3. Confirm 6 stories flip to Completed AND get archived.
4. Confirm SPRINT-01 + EPIC-001 + EPIC-002 also flip + archive (parent rollup per Step 2.6c).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — root cause is hypothesized (Step 2.6b predicate filters on approved) but not localized; may be two bugs (Case A + Case B) in one report.

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs / evidence are attached (commit hashes + state-vs-frontmatter snapshots).
- [x] Verification command (failing test) is provided.
- [ ] Root cause localized in close_sprint.mjs source (predicate inspection pending).
- [ ] One-bug-or-two question resolved (Case A SPRINT-01 vs Case B SPRINT-02).
- [ ] `approved: true` is set in the YAML frontmatter.

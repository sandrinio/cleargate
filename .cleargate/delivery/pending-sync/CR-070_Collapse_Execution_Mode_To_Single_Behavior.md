---
cr_id: CR-070
parent_ref: EPIC-021
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: protocol/sprint-execution
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T14:47:45Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Raised by sandrinio on 2026-05-19 while orchestrating pdf_processor's
  first sprint via the relay peer. Verbatim:

    "we should never have v1 or v2. only 1. what do you think? v1, v2
     is just confusing and doesn't give much value"

  Evidence on the table:

  1. The naming is implementation-versioning leaking into user-facing
     surface. "v1" and "v2" describe two coexisting modes (advisory vs.
     enforcement), not a temporal upgrade. A reader sees "v1" and asks
     when it gets deprecated — but it's not getting deprecated, it's a
     mode label dressed up as a version number.
  2. The labels carry zero information. To learn what v1 vs v2 does you
     have to read .cleargate/knowledge/cleargate-enforcement.md plus the
     long comment in Sprint Plan Template.md line 48 (~5 sentences).
     Descriptive labels would self-document.
  3. The field is functionally inescapable today. During pdf_processor's
     SPRINT-01 orchestration on 2026-05-18, the orchestrator (this
     repo's session) explicitly instructed pdf-processor to leave
     `execution_mode:` absent from the SPRINT-01 frontmatter. Inspection
     of the resulting `.cleargate/sprint-runs/SPRINT-01/state.json`
     shows `"execution_mode": "v1"` populated anyway — the reconciler
     silently defaulted it. So the field can't be opted out of even
     when the human consciously tries to.
  4. The product premise of ClearGate IS the gates. An "advisory" mode
     that lets the team ignore them is just "running without ClearGate
     while pretending to use it." If a gate is worth shipping it should
     enforce; if it's not it should be removed.

  Conclusion: collapse to one always-enforced behavior. Drop the field.
  Provide one global emergency escape hatch as an env var (never a
  per-sprint flag, never a default). Update every doc/template/script
  that mentions v1 or v2.

  Strategic value: removes a cognitive-overhead concept from the
  framework's user-facing vocabulary. Strengthens the "ClearGate
  enforces" promise. Pre-empts future "what's v3" confusion.
stamp_error: no ledger rows for work_item_id CR-070
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T14:47:45Z
  sessions: []
---

# CR-070: Collapse sprint `execution_mode` to a single always-enforced behavior — retire v1/v2 vocabulary

## 0.5 Open Questions

- **Question:** Should the env-var escape hatch be `CLEARGATE_ADVISORY=1` (boolean, all gates advisory) or something more granular like `CLEARGATE_DISABLE_GATES=worktree,surface,flashcard` (per-gate opt-out)?
- **Recommended:** Boolean `CLEARGATE_ADVISORY=1` for v1. Granular per-gate disable is over-engineering for the "something is broken on the gate side, ship anyway" emergency case this lever is for. If we discover a real need for per-gate control later, that's a follow-up CR.
- **Human decision:** _populated during Brief review_

- **Question:** What happens to historical sprint files in `.cleargate/delivery/archive/` that have `execution_mode: v1` or `v2` in frontmatter?
- **Recommended:** Leave them alone. They're archived; touching them creates noise and re-ingest churn for the wiki. Add a comment in `cleargate-enforcement.md` noting the field is retired and historical sprints retain it for archaeological accuracy.
- **Human decision:** _populated during Brief review_

- **Question:** Do we ALSO need to remove `execution_mode` from `.cleargate/sprint-runs/<sprint-id>/state.json` schema (state.schema.json)?
- **Recommended:** Yes — drop the property from the JSON Schema and from the script that populates it. Otherwise the reconciler keeps writing "v1" into a field nothing reads anymore (dead data).
- **Human decision:** _populated during Brief review_

- **Question:** The state.json schema is `schema_version: 2`. Does dropping `execution_mode` require bumping to schema_version: 3?
- **Recommended:** Yes — bump to 3, and add a migrator that strips `execution_mode` from existing state.json on first read post-upgrade. Otherwise old state.json with the field fails strict validation.
- **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The `execution_mode:` frontmatter field on Sprint files (default `"v1"`, can be set to `"v2"`).
- The two-mode dispatch in `.cleargate/scripts/close_sprint.mjs`, `init_sprint.mjs`, `update_state.mjs`, `validate_state.mjs` etc. that branches on `execution_mode === 'v2'`.
- The "Under v1 those sections are advisory only" caveats in `.cleargate/knowledge/cleargate-enforcement.md` (every section).
- The "Default v1; set to v2 only after EPIC-013 M2..." comment in `Sprint Plan Template.md:48`.
- The CLAUDE.md surface text: `**Sprint mode.** Read execution_mode: ... v1 = advisory; v2 = enforce...`.
- The `inert-mode message` printed by CLI commands under v1 (`sprint init|close, story start|complete, gate qa|arch, state update|validate`).
- The state.json `execution_mode` property + state.schema.json reference.

**New Logic (The New Truth):**

- One always-enforced behavior. All gates, all hooks, all reconcilers run as if `execution_mode: v2` always.
- The framework's value proposition is the gates; they always run.
- One global emergency escape hatch: env var `CLEARGATE_ADVISORY=1`. When set:
  - All gate failures become warnings (printed to stderr) instead of hard exits.
  - The env-var detection lives in one place: `cleargate-cli/src/util/gate-mode.ts` (new file), `isAdvisory(): boolean`.
  - Every gate caller checks `isAdvisory()` and downgrades from exit-nonzero to log-warning.
  - The env var is undocumented in user-facing docs — it's an internal break-glass tool. Mentioned only in `cleargate-enforcement.md` § "Operator Emergency Levers" (new subsection at end).
- Existing sprint files with `execution_mode:` in frontmatter: field is silently ignored by all readers (treated as "Completed = always enforced"). A `cleargate doctor` advisory line surfaces "X sprint files carry a retired `execution_mode:` field; consider removing." but does NOT auto-strip.
- New sprint files (post-CR-070): template ships without the `execution_mode:` field at all. `Sprint Plan Template.md` line 48 comment block is removed.

## 2. Blast Radius & Invalidation

This is a protocol-vocabulary CR — wide blast radius across docs, scripts, and templates, but no code path that ships product behavior changes (gates already work in v2). The "blast" is mostly find-and-purge.

- [ ] **Invalidate/Update Story:** none — no story currently in flight references execution_mode in its acceptance criteria.
- [ ] **Invalidate/Update Epic:** EPIC-021 (Solo Onboarding DX) — link as parent. No body changes.
- [ ] **Database schema impacts?** No.
- [ ] **`state.schema.json` schema bump:** Yes, schema_version 2 → 3. Migrator strips `execution_mode` on first read.
- [ ] **Wiki re-ingest:** Yes. Every sprint page that displays `execution_mode` needs re-compile after the field is dropped from the renderer.
- [ ] **CLAUDE.md (canonical + payload + live):** all three sites lose the `**Sprint mode.**` paragraph. Live `.claude/` needs manual re-sync per the dogfood-split convention.
- [ ] **`cleargate init` snapshot manifest:** items removed from canonical (Sprint Plan Template.md, knowledge/cleargate-enforcement.md if §-numbered) will show as "removed file content" in the next `cleargate upgrade` run for target repos. Expected drift; the upgrade UX should handle it.
- [ ] **User-visible behavior change:** Yes — strictness. Repos that ran v1 historically (the inert-mode no-op) now hit real gates. Mitigation: SPRINT-30 release notes call this out + `cleargate upgrade` prints a one-line "execution_mode field retired; gates now always enforce" notice when the new payload lands.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies.

- **Surface:** .cleargate/scripts/state.schema.json — declares the field this CR retires; schema_version bumped to 3 here.
- **Surface:** .cleargate/scripts/close_sprint.mjs — every branch that compares against the retired mode value; collapsed to always-run.
- **Surface:** .cleargate/scripts/init_sprint.mjs — same branches; removed.
- **Surface:** .cleargate/scripts/update_state.mjs — same; removed.
- **Surface:** .cleargate/scripts/validate_state.mjs — same; removed.
- **Surface:** .cleargate/knowledge/cleargate-enforcement.md — every "advisory vs enforcing" caveat is rewritten as "always enforces."
- **Surface:** cleargate-planning/CLAUDE.md — the Sprint-mode paragraph in the bounded block; removed.
- **Surface:** cleargate-cli/templates/cleargate-planning/CLAUDE.md — npm payload mirror of same; auto-synced via prebuild.
- **Surface:** the Sprint Plan template under .cleargate/templates — drops the retired field default and the long comment about when to flip modes. (Path contains a space, so cited in prose rather than as a parser-eligible token.)
- **Why this CR extends rather than rebuilds:** Pure deletion of a coexisting mode. No new behavior; just collapse the branch that's already there.

## 3. Execution Sandbox

**Modify:**

- `.cleargate/templates/Sprint Plan Template.md` — drop `execution_mode:` line + the 5-sentence comment block.
- `.cleargate/scripts/state.schema.json` — remove `execution_mode` property; bump `schema_version` consts to 3.
- `.cleargate/scripts/close_sprint.mjs` — every `if (state.execution_mode === 'v2')` → unconditional execution. Add migrator on read: if `state.execution_mode` exists, delete it and log one line.
- `.cleargate/scripts/init_sprint.mjs` — same: stop writing `execution_mode: "v1"` to new state.json.
- `.cleargate/scripts/update_state.mjs` / `validate_state.mjs` — same.
- `.cleargate/knowledge/cleargate-enforcement.md` — strip every "v1 advisory / v2 enforcing" caveat; rewrite as "always enforces"; add new section "Operator Emergency Levers" documenting `CLEARGATE_ADVISORY=1` for internal break-glass use.
- `cleargate-planning/CLAUDE.md` — remove `**Sprint mode.**` paragraph from the bounded block.
- `cleargate-cli/src/util/gate-mode.ts` — **new file.** Exports `isAdvisory(): boolean` reading `process.env.CLEARGATE_ADVISORY === '1'`.
- `cleargate-cli/src/commands/sprint.ts` / `cli.ts` — remove the inert-mode message path; every gate-failing branch checks `isAdvisory()` and prints to stderr instead of exiting nonzero.
- `cleargate-cli/test/util/gate-mode.test.ts` — **new file.** Cover both `CLEARGATE_ADVISORY=1` and unset.
- `cleargate-cli/test/integration/close-sprint-v3-schema.node.test.ts` — **new file.** Cover (a) fresh state.json without `execution_mode` lands as schema_version 3, (b) existing state.json with `"execution_mode": "v1"` is migrated to schema_version 3 with the field stripped on read.

**Do NOT touch:**

- Archived sprint files in `.cleargate/delivery/archive/` that carry `execution_mode:` — leave for historical accuracy.
- The gate implementations themselves (worktree isolation, surface gate, flashcard gate). They already do the right thing; CR-070 just removes their "skip" path.

## 4. Verification Protocol

**Test 1 — sprint template ships without execution_mode:**
```ts
test('Sprint Plan Template no longer declares execution_mode', () => {
  const tpl = readFileSync('.cleargate/templates/Sprint Plan Template.md', 'utf8');
  assert.doesNotMatch(tpl, /^execution_mode:/m);
});
```

**Test 2 — state.json schema rejects execution_mode:**
```ts
test('state.schema.json v3 has no execution_mode property', () => {
  const schema = JSON.parse(readFileSync('.cleargate/scripts/state.schema.json', 'utf8'));
  assert.equal(schema.properties.execution_mode, undefined);
  assert.equal(schema.properties.schema_version.const, 3);
});
```

**Test 3 — close_sprint migrates legacy state.json:**
```ts
test('close_sprint strips execution_mode from legacy state.json on read', async () => {
  // Arrange: fixture state.json with schema_version: 2 + execution_mode: "v1"
  // Act: run close_sprint.mjs --dry-run
  // Assert: state.json now has schema_version: 3 + no execution_mode key
});
```

**Test 4 — advisory env-var downgrades failures:**
```ts
test('CLEARGATE_ADVISORY=1 turns gate failures into warnings', async () => {
  // Arrange: fixture sprint with a known gate-failing state
  // Act: run gate check with CLEARGATE_ADVISORY=1
  // Assert: exit code 0 + stderr contains "[advisory]" prefix
});
```

**Test 5 — full grep gate (CI):** add `npm run check:no-execution-mode-vocabulary` that fails CI if any of these strings appear in code (excluding `.cleargate/delivery/archive/**`): `execution_mode`, `"v1"`, `"v2"` in execution-mode context. Cheap regression guard.

**Manual verification:**
1. On the CR branch, run `cleargate sprint init SPRINT-30` against this meta-repo. Confirm new state.json has no `execution_mode` field.
2. Read the resulting SPRINT-30 file from `pending-sync/`. Confirm frontmatter has no `execution_mode:`.
3. Trip a gate (e.g., commit without a flashcard entry on a story that requires one). Confirm hard exit nonzero — no inert-mode bypass available without `CLEARGATE_ADVISORY=1`.
4. Set `CLEARGATE_ADVISORY=1` in environment and re-trip the same gate. Confirm exit 0 + clear `[advisory]` warning in stderr.

**Command:** `cd cleargate-cli && npm test && npm run check:no-execution-mode-vocabulary`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — escape-hatch shape (boolean vs granular) is the main pending decision; schema migration approach is sketched but not coded.

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified (EPIC-021 link only; no in-flight story depends on this).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] Open question on escape-hatch shape resolved (recommended: boolean).
- [ ] Schema migrator approach signed off.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.

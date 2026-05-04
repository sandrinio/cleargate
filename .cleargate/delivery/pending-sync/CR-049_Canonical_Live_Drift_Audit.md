---
cr_id: CR-049
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-24
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T18:30:00Z
approved_by: human
created_at: 2026-05-04T18:00:00Z
updated_at: 2026-05-04T18:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  SPRINT-23 close session 2026-05-04 surfaced systemic canonical-vs-live
  drift in the dogfood split (per CLAUDE.md "Dogfood split — canonical
  vs live"). When `cleargate init --force` ran during sprint close to
  cure live `/.claude/` mirror drift, it ALSO clobbered:
    - `.gitignore` (rolled back from comprehensive 30-line policy to
      stale 5-line npm-payload version)
    - `.cleargate/FLASHCARD.md` (full 172-line history → 7-line header)
    - 4 `.cleargate/scripts/*` files (write_dispatch.sh, validate_state.mjs,
      test_flashcard_gate.sh, test_test_ratchet.sh) — reverted post-CR-038/
      CR-044/CR-045 fixes that shipped in live but never propagated to
      canonical.

  Hotfix `f6dfe39` (cleargate init FIRST_INSTALL_ONLY set) prevents
  future overwrites for these specific paths, but the underlying
  divergence remains: canonical (`cleargate-planning/.cleargate/scripts/*`)
  is at the pre-CR-038/044/045 baseline; live `.cleargate/scripts/*`
  carries the post-fix versions.

  CR-049 fixes the divergence root cause: bring canonical = live for the
  4 known-divergent script files + audit the entire `.cleargate/` and
  `.claude/` trees for any other drift, then add a CI guard that fails
  on canonical-vs-live byte mismatch.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T13:58:44Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-049
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T13:58:44Z
  sessions: []
---

# CR-049: Canonical-vs-Live Drift Audit + Sync + CI Guard

## 0.5 Open Questions

- **Question:** Audit scope — every `.cleargate/` and `.claude/` file, or scripts only?
  - **Recommended:** scripts only for fix; audit-only for everything else (report drift, defer fix to follow-up CR-050+ if any). Keeps blast radius bounded; the 4 known-divergent scripts are the load-bearing ones.
  - **Human decision:** _populated during Brief review_

- **Question:** CI guard — pre-commit hook OR npm test scenario?
  - **Recommended:** npm test scenario at `cleargate-cli/test/scaffold/canonical-live-parity.node.test.ts`. Runs in normal test suite; fails CI if any FIRST_INSTALL_ONLY-exempt path drifts. Pre-commit hook is too aggressive (would block legitimate one-side edits during a story before mirror sync).
  - **Human decision:** _populated during Brief review_

- **Question:** Which scripts get canonical = live (sync direction)?
  - **Recommended:** ALL 4 known-divergent files: live → canonical (live is the post-fix authoritative version). Then prebuild regenerates npm payload. Future direction: post-merge DevOps step verifies parity, NOT init-time auto-sync.
  - **Human decision:** _populated during Brief review_

- **Question:** What do we audit beyond the 4 known scripts?
  - **Recommended:** comprehensive read-only audit of `.cleargate/scripts/*`, `.cleargate/templates/*`, `.cleargate/knowledge/*`, `.claude/agents/*`, `.claude/skills/sprint-execution/SKILL.md`, `.claude/hooks/*`. Report drift count + top-3 offenders in CR-049 §3 acceptance trace. Do NOT auto-fix anything beyond the 4 — surface for SPRINT-25 if drift is widespread.
  - **Human decision:** _populated during Brief review_

- **Question:** Does this CR block SPRINT-24's other CRs?
  - **Recommended:** YES — CR-049 lands first (W1) so CR-050/051/052 develop against a clean canonical=live baseline. If CR-049 finds widespread drift, scope-cut to the 4 known + audit-only for the rest; do not balloon CR-049.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "Canonical edits propagate to live via `cleargate init` re-sync" — partially true, but `cleargate init --force` historically clobbered files the user owns. Hotfix `f6dfe39` already added FIRST_INSTALL_ONLY exemption for `.gitignore`, `FLASHCARD.md`, `.cleargate/scripts/*`.
- "Mid-sprint script fixes ship to live; canonical is updated separately" — historically optional, leading to the SPRINT-23 dogfood revert.

**New Logic (The New Truth):**
- Canonical (`cleargate-planning/.cleargate/scripts/*` etc.) is the source of truth shipped via npm. Live (`.cleargate/scripts/*` etc.) is byte-identical post-merge.
- 4 currently-divergent scripts are reconciled live → canonical.
- A test in cleargate-cli/test/scaffold/ asserts canonical-vs-live byte parity for a known set of FIRST_INSTALL_ONLY-exempt paths. CI catches drift before next sprint kickoff.

## 2. Blast Radius & Invalidation

- [ ] **Live → canonical sync (4 files):**
  - `cleargate-planning/.cleargate/scripts/write_dispatch.sh` ← `.cleargate/scripts/write_dispatch.sh` (CR-044 validator block)
  - `cleargate-planning/.cleargate/scripts/validate_state.mjs` ← `.cleargate/scripts/validate_state.mjs` (CR-045 simplified shape validator)
  - `cleargate-planning/.cleargate/scripts/test/test_flashcard_gate.sh` ← `.cleargate/scripts/test/test_flashcard_gate.sh` (protocol §4 ref)
  - `cleargate-planning/.cleargate/scripts/test/test_test_ratchet.sh` ← `.cleargate/scripts/test/test_test_ratchet.sh`
- [ ] **NEW test:** `cleargate-cli/test/scaffold/canonical-live-parity.node.test.ts` (≥6 scenarios — one per FIRST_INSTALL_ONLY-exempt path category, plus negative cases).
- [ ] **`cleargate-cli/templates/cleargate-planning/`** auto-regenerated by prebuild.
- [ ] **`cleargate-planning/MANIFEST.json`** auto-regenerated.
- [ ] **No SKILL.md edit** — canonical-vs-live audit is invisible infrastructure. Behavior change only.
- [ ] **Audit report:** `.cleargate/sprint-runs/SPRINT-24/canonical-drift-audit.md` (read-only, surfaces drift beyond the 4 known files).

## Existing Surfaces

- **Surface:** `cleargate-cli/src/init/copy-payload.ts` L49-78 — FIRST_INSTALL_ONLY set added in hotfix `f6dfe39`.
- **Surface:** `cleargate-cli/scripts/copy-planning-payload.mjs` — prebuild script that copies canonical → npm payload.
- **Surface:** `cleargate-planning/MANIFEST.json` — auto-generated parity manifest.
- **Surface:** Hotfix `f6dfe39` already addressed the **prevention** layer; CR-049 addresses the **drift cleanup** layer.
- **Why this CR extends rather than rebuilds:** prebuild + FIRST_INSTALL_ONLY exist; CR-049 adds a parity test + reconciles 4 known files. Not new infrastructure.

## 3. Execution Sandbox

**Modify:**
- 4 canonical scripts (live → canonical sync, byte-identical post-CR-049)

**Add:**
- `cleargate-cli/test/scaffold/canonical-live-parity.node.test.ts` — 6 scenarios

**Out of scope:**
- Fixing drift in non-script paths (audit-only; report in §3 acceptance trace)
- Pre-commit hook for parity (npm test scenario sufficient per Open Q2)
- Refactoring FIRST_INSTALL_ONLY logic (already shipped in hotfix `f6dfe39`)

## 4. Verification Protocol

**Acceptance:**
1. `diff cleargate-planning/.cleargate/scripts/write_dispatch.sh .cleargate/scripts/write_dispatch.sh` exits 0 (byte-identical).
2. Same for validate_state.mjs, test_flashcard_gate.sh, test_test_ratchet.sh.
3. NEW test `canonical-live-parity.node.test.ts` passes 6 scenarios on the clean baseline post-sync. Scenarios cover: scripts dir parity, agents dir parity, templates dir parity, knowledge dir parity, hooks dir parity, negative case (intentional FIRST_INSTALL_ONLY exempt path skipped).
4. Audit report `.cleargate/sprint-runs/SPRINT-24/canonical-drift-audit.md` lists every additional drifted path found OR states "no further drift" if clean.
5. `cd cleargate-cli && npm run build && npm test` exits 0.
6. Mirror parity at sprint close (DevOps): canonical = live for all 4 fixed files.

**Test Commands:**
- `cd cleargate-cli && npm test -- test/scaffold/canonical-live-parity.node.test.ts`
- (manual) `for f in write_dispatch.sh validate_state.mjs test/test_flashcard_gate.sh test/test_test_ratchet.sh; do diff cleargate-planning/.cleargate/scripts/$f .cleargate/scripts/$f; done` — silent if clean.

**Pre-commit:** `cd cleargate-cli && npm run typecheck && npm test`. Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

- [x] §0.5 Open Questions surfaced (5 questions, all with recommended defaults).
- [x] §3 Execution Sandbox lists files to touch.
- [x] §4 Verification Protocol has testable acceptance.
- [ ] Human approves §0.5 defaults (or overrides).
- [ ] Lane assigned at SDR (preliminary: standard — multi-file edit + new test).

---

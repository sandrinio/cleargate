---
sprint_id: SPRINT-30
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-30
carry_over: false
lifecycle_init_mode: warn
remote_id: null
source_tool: null
status: Completed
start_date: 2026-05-19
end_date: 2026-06-02
synced_at: null
epics:
  - EPIC-021
bugs:
  - BUG-031
  - BUG-032
crs:
  - CR-068
  - CR-069
  - CR-070
  - CR-071
  - CR-072
  - CR-073
area: cli/init,protocol/sprint-execution,onboarding-dx
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-18T20:42:34Z
context_source: |
  Born from live-dogfood feedback: sandrinio onboarded ClearGate into a
  fresh repo (pdf_processor) for the first real solo-developer product
  build (a Python AcroForm PDF tool, no prior ClearGate state). The
  orchestrator (this meta-repo's session) watched the install + the
  PRD-to-epics decomposition + SPRINT-01 execution via relay. Every
  protocol friction or bug surfaced during that flow was captured here.

  Root-cause sandrinio attributes Sprint-1's worst friction (silent MCP
  failures, hook misses) to NOT restarting Claude Code after
  `cleargate init`. CR-069 (the loud final restart banner) is the
  primary mitigation; CR-068 + BUG-031 are adjacent install-hygiene
  fixes; CR-070 is a vocabulary-collapse the user requested when the
  v1/v2 mode field surfaced as cognitive noise.

  Scope will grow as pdf_processor SPRINT-02 surfaces more findings —
  this sprint plan is deliberately structured to absorb new items
  filed mid-sprint (see §3 Sprint-grow protocol).
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-4-8
  last_stamp: 2026-05-29T09:12:04Z
  sessions:
    - session: 7fededeb-34d1-4a55-9c7a-63ed97361a54
      model: claude-opus-4-8
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-29T09:07:47Z
---

# SPRINT-30: Solo Onboarding Dogfood Hardening

## 0. Stakeholder Brief

- **Sprint Goal:** Eliminate the install + first-sprint friction surfaced when the framework was used end-to-end by a single solo developer with no prior ClearGate context.
- **Business Outcome:** A solo developer running `cleargate init` in a new repo gets a clean, opt-in onboarding: explicit pre-member state until `cleargate join`, prominent restart prompt, zero deprecation noise, and one always-enforcing protocol vocabulary instead of two confusing modes. Cuts the silent-failure window between "init exited 0" and "the framework actually works."
- **Risks (top 3):**
  1. **CR-070 vocabulary collapse** has wide blast radius (templates, scripts, knowledge docs, CLAUDE.md canonical + payload + live). Three-site dogfood-mirror discipline applies — easy to ship the change and forget to re-sync live `/.claude/`.
  2. **BUG-031 (project_id leak)** fix risks breaking the convenience of "you already joined elsewhere, we remember you." Need the per-repo / global identity split to feel natural, not bureaucratic.
  3. **CR-069 (restart banner)** is a UX-visible change in the literal first message new users see post-install. Wording matters — gets exactly one chance to make a first impression.
- **Metrics:** A fresh-machine, fresh-repo `cleargate init` run produces (a) `state: pre-member` on `doctor --session-start`, (b) zero `DeprecationWarning` emissions, (c) a visible final restart banner on stderr, (d) zero `v1`/`v2` strings in any user-facing file outside `.cleargate/delivery/archive/`.

## Sprint Goal

Ship BUG-031 + CR-068 + CR-069 + CR-070 — the four findings produced by pdf_processor's first install + first sprint — plus any additional findings filed during pdf_processor SPRINT-02. Net result: the next solo developer who runs `cleargate init` gets a hardened first-touch experience.

## 1. Consolidated Deliverables

| Story / Item ID | Title | Type | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|---|
| `BUG-031` | `cleargate init` inherits global project_id, skips pre-member | Bug (P1) | standard | M1 | n | med — identity/state resolver refactor |
| `CR-068` | Silence DEP0190 `shell:true` warning | CR | fast | M1 | y | low |
| `CR-069` | Loud final stderr banner for MCP-restart need | CR | standard | M1 | y | low |
| `CR-070` | Collapse v1/v2 `execution_mode` to single always-enforced behavior | CR | standard | M2 | n | high — wide blast radius across templates/scripts/docs |
| `CR-071` | Sprint execution autonomy contract — protocol anchor + agent propagation + soft hook | CR | standard | M2 | y | med — touches every agent definition + dogfood-mirror |
| `BUG-032` | `close_sprint.mjs` back-sync silently skips story frontmatter | Bug (P1) | standard | M1 | n | high — root cause may be two bugs (Case A SPRINT-01 + Case B SPRINT-02 in pdf_processor); test fixtures from both available |
| `CR-072` | Expand default `cleargate init` `.gitignore` — secrets + language artifacts + OS junk | CR | fast | M1 | y | low — pure template expansion |
| `CR-073` | Tighten readiness-gate path-extractor regex to eliminate false-positive matches | CR | fast | M1 | y | low — one regex change + tests |
| _(future)_ | Filed mid-sprint from pdf_processor SPRINT-02 watch | — | — | M2/M3 | — | — |

**Initial milestone slicing:**

- **M1 — Install-hygiene quick wins.** BUG-031 + CR-068 + CR-069 + CR-072 + BUG-032. First four touch install / init surface; BUG-032 touches close_sprint.mjs but lives in M1 because it's P1-High severity and blocks future clean closes. Can decompose into ~6 stories total. CR-068, CR-069, CR-072 can run parallel (disjoint surfaces in init.ts vs gitignore template).
- **M2 — Protocol vocabulary + agent contracts.** CR-070 (vocabulary collapse) + CR-071 (autonomy contract). Can run partially parallel — CR-070 owns templates/schema/scripts; CR-071 owns protocol doc + agent definitions + new hook. Both write to `cleargate-planning/CLAUDE.md` (different paragraphs) — single merge point needs Architect ordering.
- **M3 — Dogfood findings absorbed mid-sprint.** Items filed from pdf_processor SPRINT-02 watch. Scope unknown at sprint start (see §3).

## 2. Execution Strategy

*(Architect populates §§2.1–2.5 during Sprint Design Review before execution. Stubbed below.)*

### 2.1 Phase Plan

- **Wave 1 (parallel):** CR-068 ‖ CR-069 — disjoint surfaces in `init.ts`.
- **Wave 2 (sequential after Wave 1):** BUG-031 — touches identity/state resolver; depends on Wave 1 stability to test cleanly.
- **Wave 3 (mixed):** CR-070 + CR-071. CR-070's story sequence runs sequentially (shared knowledge-doc + CLAUDE.md). CR-071's protocol-doc anchor story runs in parallel with CR-070's first story (disjoint files); CR-071's agent-propagation story serializes after CR-070's CLAUDE.md edit (both touch `cleargate-planning/.claude/` tree).
- **Wave 4 (TBD):** mid-sprint additions from pdf_processor SPRINT-02 watch.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-cli/src/commands/init.ts` | BUG-031, CR-068, CR-069 | CR-068 → CR-069 → BUG-031 | CR-068 is pure cleanup (drops `shell: true`); CR-069 adds the banner at the end of init's flow; BUG-031 adds identity/state resolver changes that touch the init entry path. |
| `cleargate-planning/CLAUDE.md` (+ payload + live) | CR-070 only | n/a | Single-CR ownership. |
| `.cleargate/knowledge/cleargate-enforcement.md` | CR-070 only | n/a | Single-CR ownership. |
| `.cleargate/scripts/state.schema.json` + `close_sprint.mjs` + `init_sprint.mjs` | CR-070 only | n/a | Single-CR ownership but multiple files; one story owns all schema-write surfaces, follow-up story consumes them. |
| `.cleargate/knowledge/cleargate-protocol.md` | CR-071 only | n/a | Single-CR ownership — new § Sprint Execution Autonomy section. |
| `.claude/agents/*.md` (architect/developer/qa/devops/reporter) | CR-071 only | n/a | Single-CR ownership; one story propagates Autonomy Contract to all five files. |
| `cleargate-planning/CLAUDE.md` (canonical) + payload mirror + live | CR-070 + CR-071 | CR-070 → CR-071 | CR-070 removes `**Sprint mode.**` paragraph; CR-071 may add a one-line autonomy pointer. Land 070 first so 071's pointer doesn't reference a paragraph mid-deletion. |

### 2.3 Shared-Surface Warnings

- **Three-site dogfood-mirror.** Any change to `cleargate-planning/CLAUDE.md` (CR-070's main doc surface) must trigger `npm run prebuild` in `cleargate-cli/` to re-sync the npm payload (`cleargate-cli/templates/cleargate-planning/CLAUDE.md`). Live `/.claude/` is gitignored — must hand-port or re-run `cleargate init` against this meta-repo after merge. Architect: explicitly list "re-sync live" as a DoD item on the CR-070 closing story.
- **Schema-version migrator** in CR-070 changes `schema_version: 2 → 3`. Any sprint that started under schema 2 (SPRINT-28 just closed, SPRINT-29 abandoned) needs migration on first read. Verify migrator does not corrupt SPRINT-28's archived state.json.

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `CR-068` | fast | Pure noise-removal; no behavior change; one-file diff. |

### 2.5 ADR-Conflict Flags

- **CR-011 (Capability_Gating_By_Membership)** is the canonical ADR that BUG-031 is a regression against. CR-011 explicitly defines pre-member as the default state for fresh repos. BUG-031 fix realigns behavior with CR-011's intent — extends, doesn't conflict.
- **CR-019 (Sprint Close as Gate-4-class)** introduced the v2-strict close pipeline. CR-070's collapse means CR-019's "Under v2..." caveats become unconditional. No conflict; rewrites the conditional language.
- **CR-059 (Smarter Session-Load Restart Warning)** is adjacent to CR-069 — CR-059 covers `cleargate upgrade`, CR-069 covers `cleargate init`. CR-069 should extract CR-059's `extractSessionLoadDelta` helper to a shared util (`cleargate-cli/src/util/session-load-delta.ts`) if currently private to upgrade.ts.
- **`.claude/skills/sprint-execution/SKILL.md:640`** carries the current single-sentence autonomy rule that CR-071 expands and anchors in the protocol doc. CR-071 does NOT delete the skill line — replaces it with a cross-reference. No conflict; pure promotion.

## 3. Sprint-grow protocol (mid-sprint additions from pdf_processor SPRINT-02 watch)

This sprint is **deliberately scoped to absorb new items filed mid-flight** as the orchestrator watches pdf_processor's second sprint. Two rules govern in-sprint additions:

1. **Eligibility filter.** An item filed mid-sprint enters SPRINT-30 scope ONLY if:
   - It's a ClearGate finding (bug/CR/missing-feature in the framework itself), not pdf_processor-product work.
   - It's `lane: fast` OR Architect signs off that it fits remaining sprint capacity without displacing already-scheduled milestones.
   - It has been filed as a normal pending-sync work item with Gate-1 approval from sandrinio.
2. **Drop-from-scope rule.** Any item that doesn't meet (1) is filed in pending-sync but **deferred to SPRINT-31** (next sprint, also dogfood-feedback-themed if pdf_processor sprint 3+ is in flight).

**Working list of additions (populated as findings land):**

- _(none yet — pdf_processor SPRINT-02 has not started as of this draft)_

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| CR-070 vocabulary collapse breaks SPRINT-28's archived state.json on re-read | Migrator strips field on read; doesn't rewrite archive. Test in fixture-form before main merge. |
| BUG-031 fix overshoots — strips identity inference, makes onboarding more bureaucratic | Keep email inference from git config global; only `project_id` becomes per-repo. Banner shows inferred identity + asks for `cleargate join` only. |
| CR-069 banner wording lands awkwardly — first impression failure | Architect drafts banner copy in §2 SDR + asks sandrinio for sign-off BEFORE story dispatch. |
| Three-site dogfood-mirror skipped — canonical edits don't reach live `/.claude/` | DoD item on CR-070's closing story: `cleargate init` re-run against meta-repo + visual confirm of live CLAUDE.md. |
| pdf_processor SPRINT-02 surfaces a major finding mid-sprint that doesn't fit remaining capacity | §3 drop-rule: defer to SPRINT-31 with rationale; don't blow this sprint's commitments. |

## Metrics & Metadata

- **Expected Impact:** Solo onboarding "time to confident first sprint" cut by removing the silent-restart failure mode (the actual cause of pdf_processor SPRINT-01's worst friction). DX measurably cleaner.
- **Priority Alignment:** All four initial scope items came from live user feedback within ≤24h of the install. Highest-signal sprint backlog the framework has had.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** CR-068 in Wave 1 — smallest, lowest-risk, builds team momentum on the init.ts surface.
- **Relevant Context:**
  - `cleargate-cli/src/commands/init.ts` (Wave 1 + 2 main surface)
  - `cleargate-cli/src/commands/upgrade.ts:455-475` (CR-059's restart-warning pattern — reference for CR-069)
  - `.cleargate/delivery/archive/CR-011_Capability_Gating_By_Membership.md` (canonical state-machine ADR for BUG-031)
  - `.cleargate/templates/Sprint Plan Template.md:48` (the comment block CR-070 deletes)
- **Constraints:**
  - **Do NOT push** any work item via `cleargate_push_item` until BUG-031 ships and the meta-repo's MCP session has been re-joined to the correct project. Until then, all items stay local-authored.
  - **Three-site mirror discipline** on every canonical edit (canonical → payload via `npm run prebuild` → live via manual port).
  - **Test in fixture form first** for the schema migrator (CR-070). Do not run the migrator against `.cleargate/sprint-runs/SPRINT-28/state.json` until fixtures pass.

---

## ClearGate Gate 2 Readiness

- [x] Items decomposed (4 known + scope-grow protocol for unknowns).
- [x] All items at 🟢 ambiguity? BUG-031 🟡 (leak source TBD), CR-068 🟡 (call-site TBD), CR-069 🟡 (banner format TBD), CR-070 🟡 (escape-hatch shape TBD). All Yellow with sketched recommendations — Architect SDR closes them.
- [ ] §2 Execution Strategy fully written (stubbed only).
- [ ] All four items have `approved: true` in frontmatter.

**Sprint cannot move to Active state until Gate 2 conditions satisfy. Currently: Architect SDR pending + four items pending approval.**

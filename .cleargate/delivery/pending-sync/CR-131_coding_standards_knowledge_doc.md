---
cr_id: CR-131
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
area: agent-prompts,knowledge,developer,qa,architect
context_source: "Owner discussion 2026-11-12: proposed a CG_CODING_STANDARDS.md modelled on a team style guide but generalized (language- and repo-agnostic, CS-grounded). Research the same day across ~15 agent frameworks (BMAD, Spec Kit, Kiro, superpowers, AGENTS.md/Codex, Claude Code, Cursor, Copilot, CodeRabbit, Qodo, …) plus evidence (arXiv 2602.11988 'Evaluating AGENTS.md', Anthropic Claude Code best practices, IFScale arXiv 2507.11538, METR reward-hacking report, GitClear 2025). Owner chose generic-only: no repo-specific layer, no FLASHCARD promotion loop. Grounded against cleargate-cli scaffold on 2026-11-12. Owner approved 2026-11-12 ('agree with your recommendations'): all six §0.5 questions resolved as Recommended."
created_at: 2026-11-12T16:16:01.217Z
updated_at: 2026-11-12T16:16:01.217Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-12T16:19:39Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-131
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-12T16:19:39Z
  sessions: []
last_contradict_sha: "8c229c0549b8be7cbd1524a4e6ab5d633fc250b63e741326453fdeb96dba0f5d"
---

# CR-131: Generic Coding Standards Knowledge Doc for Execution Agents

## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** File name and location: `.cleargate/knowledge/coding-standards.md` or a root-level `CG_CODING_STANDARDS.md`?
- **Recommended:** `.cleargate/knowledge/coding-standards.md`. It matches the lowercase knowledge-doc convention, ships with no new code from `scaffold/core`, is already covered by the drift check, and keeps target repos' roots clean.
- **Human decision:** ✅ accepted as Recommended (sandrinio 2026-11-12)

- **Question:** Which rules win when this file conflicts with repo-specific rules or with itself?
- **Recommended:** Repo rules win: CLAUDE.md/AGENTS.md outside the ClearGate block, sprint-context Cross-Cutting Rules, and linter or formatter config. When rules inside the file conflict, use this tie-break order: correctness, then security, then clarity, then consistency with surrounding code, then performance (only when measured), then brevity.
- **Human decision:** ✅ accepted as Recommended (sandrinio 2026-11-12)

- **Question:** Does a standards violation block QA?
- **Recommended:** Yes for `[qa]` rules: QA returns FAIL, cites the rule ID, and the failure counts toward the existing two-round kickback cap. `[advisory]` rules are noted in VERDICT and never cause a FAIL on their own.
- **Human decision:** ✅ accepted as Recommended (sandrinio 2026-11-12)

- **Question:** How do agents load the file: a Read at startup, `skills:` preload, or a `SubagentStart` hook?
- **Recommended:** A Read at startup, the same pattern developer.md:20 already uses for `sprint-context.md`. It works on both hosts because the Codex TOMLs are generated from the Claude agent files. `skills:` and `SubagentStart` are Claude-only, and BUG-112 shows that Claude-only instructions break Codex agents. Revisit if `RULES_CITED` data suggests agents skip the file.
- **Human decision:** ✅ accepted as Recommended (sandrinio 2026-11-12)

- **Question:** What happens to the overlapping guardrails in developer.md:104 ("Never mock the database… real Postgres + Redis") and developer.md:106 ("No backwards-compat hacks, no feature flags, no TODO-for-later")?
- **Recommended:** Replace both with pointers to the matching rules (TEST-5, SIMP-2, DOC-2). Line 104 is this repo's own stack rule and ships to every target repo. This repo loses nothing, because its CLAUDE.md already says "Real infra, no mocks for database tests".
- **Human decision:** ✅ accepted as Recommended (sandrinio 2026-11-12)

- **Question:** How is the file maintained after creation?
- **Recommended:** No automated loop. The file states its own limits (28 rules or fewer, 120 lines or fewer; adding a rule means merging or cutting one) and its review triggers: a model upgrade (delete rules the model now follows unprompted) and a rule QA has not cited for several sprints. Changes ship as normal scaffold releases.
- **Human decision:** ✅ accepted as Recommended (sandrinio 2026-11-12)

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Code quality for the Developer, QA and Architect agents depends on model defaults. Their prompts carry test conventions plus three scattered guardrails, and no shared standard exists for either writing or reviewing code.
- developer.md:104 ships this meta-repo's "integration tests against real Postgres + Redis" rule to every target repo, whatever its stack.
- developer.md:106 states anti-over-engineering and no-TODO rules in a form QA cannot cite.
- The assumption that a long guide of CS principles improves agent output. The evidence says the opposite: context files add about 20% cost for no significant success gain (arXiv 2602.11988), adherence falls as the instruction count rises (IFScale), and vendor guidance is to keep files under 200 lines and include only what the model would otherwise get wrong.

**New Logic (The New Truth):**
- One generic, language-agnostic and repo-agnostic file, `.cleargate/knowledge/coding-standards.md`. It ships from `cleargate-cli/scaffold/core/` and is overwritten on upgrade. It has **no repo-owned section**: repo-specific rules stay in their existing homes (FLASHCARD, sprint-context Cross-Cutting Rules, CLAUDE.md outside the ClearGate block) and take precedence over it.
- The content covers only what coding agents demonstrably get wrong: test tampering, over-engineering, duplication, swallowed errors, scope creep, injection and leaked secrets. Each rule has a stable ID, an enforcement tag and a one-line *why*. The wording is positive and plain, without caps or emphasis.
- Developer, QA and Architect Read the file at startup.
- QA checks the diff against it, FAILs on `[qa]` rules citing the ID, and reports `RULES_CITED:`. That line is the data that later tells us which rules can be pruned.

**Normative content of the new file.** The Developer transcribes this. Wording may be tightened, but IDs, tags and meaning may not change.

```markdown
# Coding Standards

Language- and repo-agnostic rules for code that ClearGate's Developer writes and QA reviews.
They cover what coding agents demonstrably get wrong; everything else is left to judgment
and the repo's own tooling.

- **Precedence.** Repo rules override this file: CLAUDE.md / AGENTS.md outside the ClearGate
  block, sprint-context Cross-Cutting Rules, and linter or formatter config.
- **Tags.** `[tooling]` a hook, linter or CI enforces it. `[qa]` QA checks the diff and FAILs
  on a violation, citing the ID. `[advisory]` a judgment call — QA notes it, never FAILs on it alone.
- **When rules conflict:** correctness → security → clarity → consistency with surrounding
  code → performance (only when measured) → brevity.
- **Maintenance.** At most 28 rules and 120 lines; adding a rule means merging or removing
  one. Review on every model upgrade (delete rules the model now follows unprompted) and when
  QA has not cited a rule for several sprints.

## Test integrity
- **TEST-1** [qa] Every behaviour change or bug fix ships with a test that fails without it. *Why:* a test that was never red proves nothing.
- **TEST-2** [tooling][qa] Make the code pass the test, never the test pass the code: no weakened assertions, skips, deletions, special-cased test inputs or hard-coded expected outputs. If a test is wrong, say so in the report. *Why:* it hides regressions, and agents are documented doing it. (QA-Red files are also guarded by the pre-commit surface gate.)
- **TEST-3** [qa] Assert observable behaviour through the public interface, not private state or which internal calls were made. *Why:* tests then survive refactors and catch real breaks.
- **TEST-4** [qa] Keep tests hermetic and order-independent: control time, randomness, network and shared state; wait on a condition, never a fixed sleep. *Why:* flaky tests teach everyone to ignore red.
- **TEST-5** [advisory] Prefer real or fake collaborators over mocks; mock only slow, costly or nondeterministic boundaries. *Why:* mocks encode assumptions that drift from the real thing.

## Simplicity and reuse
- **SIMP-1** [qa] Before writing a helper, search for an existing one and reuse it; a new near-duplicate is a FAIL. *Why:* duplication is the most-measured regression in AI-written code.
- **SIMP-2** [qa] Build only what the task needs: no speculative options, flags, parameters, extension points, compatibility shims, or wrappers that only pass calls through. *Why:* unused generality is cost with no benefit.
- **SIMP-3** [advisory] Extract an abstraction at the third real use, not the first. *Why:* duplication is cheaper than the wrong abstraction.

## Errors and failure
- **ERR-1** [qa] Every caught error is handled, logged with context, or re-raised; no empty catch and no fallback value that hides a bug. *Why:* silent failure turns bugs into corrupt state.
- **ERR-2** [qa] Catch only errors you can act on at that point, keep the original cause when wrapping, and branch on an error's type or code, never its message text. *Why:* broad catches hide bugs; messages change.
- **ERR-3** [advisory] Fail fast on programmer errors and broken invariants; degrade gracefully only for expected environmental failures, and make the degradation visible. *Why:* resilience must not mask bugs.
- **ERR-4** [qa] Bound everything that can grow or wait: loops, retries, queues and I/O get explicit limits and timeouts; retry only transient failures, with backoff, and only idempotent operations. *Why:* unbounded work is how outages start.

## Data and boundaries
- **DATA-1** [advisory] Parse external input into a validated, typed value once at the boundary; inside, rely on the type instead of re-checking. *Why:* one place to get validation right.
- **DATA-2** [qa] Model alternatives as an enum or tagged union, not combinations of flags or nullable fields, and handle every case explicitly — the unknown case fails loudly. *Why:* illegal states become unrepresentable.
- **DATA-3** [qa] A function does one thing and returns one shape: no boolean or mode parameters that switch behaviour, no return type that varies by input. *Why:* call sites stay readable and checkable.
- **DATA-4** [qa] Read configuration and environment at the edge and pass values in; core logic does not read env vars or globals. *Why:* hidden inputs make code untestable.

## Change hygiene
- **CHG-1** [qa] Change only what the task needs: no drive-by refactors, renames or reformatting; report unrelated problems instead of fixing them. *Why:* small diffs are reviewable and revertible.
- **CHG-2** [qa] Match the surrounding code's conventions (naming, structure, error and test style), even where you would choose differently. *Why:* consistency beats a local optimum.
- **CHG-3** [advisory] Before removing or changing behaviour you don't understand, find out why it exists (history, tests, callers). *Why:* the fence was put there for a reason.
- **CHG-4** [qa] Finish the change: update every caller, test, doc, config entry and migration it affects; search all uses before renaming or redefining anything. *Why:* half-applied changes break far from the diff.
- **CHG-5** [qa] Treat observable behaviour as a contract: changing a public interface, output format or default is a declared breaking change, not a side effect. *Why:* someone depends on it.
- **CHG-6** [qa] Add a dependency only with a stated reason in the report. *Why:* every dependency is a permanent supply-chain and upgrade cost.

## Security
- **SEC-1** [qa] Never build SQL, shell commands or evaluated code by joining strings; use parameters and argument arrays. *Why:* injection.
- **SEC-2** [qa] Keep secrets, tokens and personal data out of code, fixtures, logs and error messages. *Why:* source and logs leak.
- **SEC-3** [qa] Treat external input as hostile: validate against an allow-list at the boundary and check authorization on every access path, denying by default. *Why:* the two most common code-level breaches.

## Readability
- **DOC-1** [advisory] Comments explain why — intent, constraints, non-obvious decisions — not what the code says; update them with the code. *Why:* stale comments mislead.
- **DOC-2** [qa] Leave no dead code, commented-out code, or TODO without a linked work item. *Why:* version control keeps history; orphan TODOs never get done.
- **DOC-3** [advisory] Name things for what they are, without cryptic abbreviations; rename when the meaning changes. *Why:* names are the cheapest documentation.
```

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: none. No story's acceptance criteria are changed by adding a review standard.
- [x] Invalidate/Update Epic: none invalidated. These Draft items touch the same prompt files, which is a sequencing risk rather than a gate reset:
  - [[EPIC-059]] edits `qa.md`, `architect.md` and the sprint-execution `SKILL.md`.
  - [[CR-122]] and [[SPRINT-43]] edit `developer.md`.
  - If they run in the same sprint, merge order matters.
- [x] Database schema impacts? No.
- **Behaviour shift (risk):**
  - QA can now FAIL a story that meets every Gherkin scenario but breaks a `[qa]` rule. Expect more first-round kickbacks in the first sprint after merge.
  - The existing two-round cap and ESCALATE path bound the cost.
- **Prompt cost (risk):** Three roles each read about 120 lines (roughly 2k tokens) per dispatch. That is accepted, and bounded by the file's own size cap.
- **Existing items unaffected:** Target repos that wrote their own standards into CLAUDE.md keep them, and those rules win under the precedence rule.
- **Dogfood:**
  - After merge, rebuild `dist` and re-sync the live `/.claude/agents/*` and `.cleargate/knowledge/` in this repo.
  - Until then, `cleargate doctor` reports drift.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:20` — the startup Read of `sprint-context.md`. The new startup Read reuses this pattern.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:91` — the CR-111 test-layer naming text, which refers to the "Never mock the database" rule "below". That reference must be retargeted.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:104` — the "Never mock the database … real Postgres + Redis" guardrail. It is evicted and replaced by a pointer to TEST-5.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md:106` — the "No backwards-compat hacks, no feature flags, no TODO-for-later" guardrail. It is folded into SIMP-2 and DOC-2.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:141` — the review checklist, which gains a standards step.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:146` — the Output shape, which gains a `RULES_CITED:` line. The only consumer is the prose in the sprint-execution SKILL.md; no script parses QA output.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:20` and `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md:72` — the startup Read and the reuse/no-duplication blueprint rule. Both already agree with SIMP-1.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md:63` — the "Reuse First" table, where duplication is already a kick-back criterion. It is consistent with SIMP-1.
- **Surface:** `cleargate-cli/scripts/build-codex-payload.mjs` — generates the Codex role files, such as `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml`, from the Claude agent files. `prebuild` runs it with `--check`.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-commit-surface-gate.sh` — the CR-043 gate against tampering with red tests, which backs TEST-2's `[tooling]` tag.
- **Why this CR extends rather than rebuilds:** The agents already read context at startup, Architect and the sprint context already treat duplication as a kick-back, and CR-043 already guards red tests. This CR collects those scattered rules into one citable file and adds only the rules nothing covers today. It does not add a new loading mechanism, parser or hook.

## Prior work

- [[EPIC-059]] — Draft. Adds process rules to the same `qa.md`, `architect.md` and `SKILL.md` files. Closest overlap; sequence the two.
- [[SPRINT-43]] — Draft. Execution-loop efficiency and Developer context, the main existing item on agent prompt size.
- [[CR-122]] — Draft. Developer reads red tests, and edits `developer.md` guardrails next to the lines this CR evicts.
- [[BUG-112]] — Codex agents are told to call a Claude-only Skill tool. This is why loading is a plain file Read.
- [[BUG-115]] — §D.5.1 requires a `code-simplifier` agent that is not installed. That is the consolidation and duplication review; this CR does not replace it.
- [[CR-043]] — Completed. Red-test tamper gate; backs TEST-2.
- [[CR-047]] — Completed. Test Pattern Validation, which stops Dev weakening tests through wiring "fixes".
- [[EPIC-043]] — Completed. Framework hygiene review ("under-gardened, not over-engineered").
- Wiki query: no wiki page or topic covers a coding-standards doc. A grep of the archive and FLASHCARD found nothing beyond the items above.

## 3. Execution Sandbox

All edits land in the `cleargate-cli` repo on a `story/CR-131` branch. Nothing is edited in this meta-repo except the post-merge live re-sync.

**Create:**
- `cleargate-cli/scaffold/core/.cleargate/knowledge/coding-standards.md`
- `cleargate-cli/test/docs/coding-standards.node.test.ts`

**Modify:**
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/developer.md`
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/architect.md`
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/developer.toml` (regenerated only, never hand-edited)
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml` (regenerated only)
- `cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml` (regenerated only)

**Out of scope:**
- A repo-specific standards layer, and any bounded block in the new file
- FLASHCARD promotion and `[P]` markers
- Reporter tallying of `RULES_CITED`
- Any hook or `skills:` preload
- Changes to the sprint-execution SKILL.md

## Task Breakdown

- [ ] Write `scaffold/core/.cleargate/knowledge/coding-standards.md` from the normative block in §1. Keep it to 120 lines or fewer, with 28 rules or fewer.
- [ ] Update `developer.md`:
  - add a startup Read of `.cleargate/knowledge/coding-standards.md` beside the line-20 `sprint-context.md` Read; if the file is missing, continue and say so in NOTES
  - replace line 104 with a pointer to TEST-5
  - replace line 106 with a pointer to SIMP-2 and DOC-2
  - retarget the line-91 "Never mock the database below" reference to TEST-5
- [ ] Update `qa.md`:
  - add a checklist step: check the diff against the standards; a `[qa]` violation is FAIL with the rule ID in VERDICT; an `[advisory]` rule is noted only
  - add `RULES_CITED: <IDs or "none">` to the Output shape after `REGRESSIONS:`
  - add a startup Read
- [ ] Update `architect.md`: add a startup Read, and have blueprints cite SIMP, DATA or CHG rule IDs where a design choice turns on one.
- [ ] Run `npm run gen:codex` to regenerate the three Codex TOMLs.
- [ ] Write `test/docs/coding-standards.node.test.ts` covering the §4 scenarios.
- [ ] Run `npm run typecheck` and `npm test` until both are green.
- [ ] After merge:
  - rebuild `dist`
  - run `node cleargate-cli/dist/cli.js init` from the meta-repo root to re-sync the live `/.claude/` and `.cleargate/knowledge/`
  - confirm `node cleargate-cli/dist/cli.js doctor` reports no drift

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run typecheck && tsx --test test/docs/coding-standards.node.test.ts && node scripts/build-codex-payload.mjs --check && npm test`

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | There is one path: each role reads one file at startup. There is no alternate success route. |
| Interfaces | T | Two hosts expose the behaviour: the Claude agent `.md` files and the generated Codex `.toml` roles. |
| Data | F | The file's content is fixed. Behaviour does not vary by data type, shape or volume. |
| Rules | T | Two rules constrain the outcome: `[qa]` violations FAIL while `[advisory]` ones never FAIL alone, and repo rules override the file. |

```gherkin
Feature: Generic coding standards for execution agents

  Scenario: The standards file ships within its own limits
    Given the cleargate-cli scaffold
    When coding-standards.md is read from scaffold/core/.cleargate/knowledge/
    Then it has at most 120 lines and at most 28 rule lines
    And every rule line carries a unique ID matching (TEST|SIMP|ERR|DATA|CHG|SEC|DOC)-\d+
    And every rule line carries at least one of [tooling], [qa], [advisory]
    And it states that repo rules take precedence over it

  @interfaces
  Scenario Outline: Each execution role reads the file at startup on both hosts
    Given the <host> agent definition for <role>
    When its instructions are read
    Then they direct a Read of .cleargate/knowledge/coding-standards.md before implementation or review

    Examples:
      | host   | role      |
      | claude | developer |
      | claude | qa        |
      | claude | architect |
      | codex  | developer |
      | codex  | qa        |
      | codex  | architect |

  @rules
  Scenario: QA blocks on qa-tagged rules and only notes advisory ones
    Given qa.md
    When its review checklist and Output shape are read
    Then a [qa] rule violation is a FAIL that cites the rule ID
    And an [advisory] rule is never a FAIL on its own
    And the Output shape contains a RULES_CITED line

  Scenario: The meta-repo stack rule no longer ships to target repos
    Given developer.md
    When its Guardrails section is read
    Then it no longer names Postgres or Redis
    And it no longer says "Never mock the database" in any section
    And it points to TEST-5, SIMP-2 and DOC-2 instead

  Scenario: The Codex payload is in sync with the edited agents
    Given the edited Claude agent files
    When build-codex-payload.mjs runs with --check
    Then it exits 0
```

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | One per Gherkin scenario, in `test/docs/coding-standards.node.test.ts`. They assert the facts in the code (prompt text, file limits), not merely that files exist. |
| Integration tests | 0 | Nothing to integrate: only prompt text and a knowledge doc change. The `build-codex-payload.mjs --check` run in the verify command covers the generated payload. |
| E2E / acceptance tests | 0 | Whether agents actually follow the rules can only be observed in a live sprint, from `RULES_CITED` lines in QA reports. The first sprint after merge is that observation, recorded in its REPORT. |

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** This came from owner discussion on 2026-11-12 plus research (sources in frontmatter). The owner chose a generic-only scope. It is grounded against `cleargate-cli` scaffold files at the line numbers cited in Existing Surfaces. Owner approved all six §0.5 recommendations on 2026-11-12.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

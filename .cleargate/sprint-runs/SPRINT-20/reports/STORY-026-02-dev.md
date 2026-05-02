# STORY-026-02 Dev Report — CLAUDE.md Prune (Live + Canonical)

## 1. Line counts pre/post prune

| File | Pre-prune | Post-prune | Net delta |
| --- | --- | --- | --- |
| `CLAUDE.md` (live) | 161 | 143 | -18 lines |
| `cleargate-planning/CLAUDE.md` (canonical) | 70 | 62 | -8 lines |

## 2. R7 waiver acknowledgement

R7 numeric target (≥60 lines deleted per file) is waived per orchestrator decision and Architect M2 plan rationale:
- Live file pre-prune was 161 lines (not the 200+ estimated when R7 was authored). Max safe delete without crossing R4/R5 is ~22 lines.
- Canonical file pre-prune was 70 lines — mathematically impossible to delete 60 lines.
- R7 was authored against a stale pre-prune SHA estimate (pre-Wave-1+2 collapse).
- R1 prune surface (§3.2) fully applied; R4/R5 preserved. This plan's §R7 escalation note is the authority.

DoD §4.2 line-count delta checkbox reframed: "R7 numeric target waived; prune surface per §3.2 R1 fully applied. R4 + R5 preserved."

## 3. Verbatim R2 + R3 inserted text

Both files received identical insertion immediately after the "Triage first, draft second." paragraph:

```markdown
**Sprint execution.** When a sprint is active, the orchestration playbook lives at `.claude/skills/sprint-execution/SKILL.md` — load it before dispatching any execution agent (Architect / Developer / QA / Reporter). The skill is the canonical four-agent-loop spec; the always-on CLAUDE.md keeps only the halt-rules and the load-skill contract.

**Skill auto-load directive.** When the SessionStart banner emits `Load skill: <name>`, invoke the Skill tool to load it before continuing. Claude Code's description-match auto-load is advisory; this rule is the contract.
```

## 4. Preserved halt-rule grep verification

Grep audit (`grep -cE "(--assume-ack|Triage first|Brief is the universal|Halt at gates|State-aware surface|Sprint mode|Boundary gates)"`):

- `CLAUDE.md`: **9 hits** (≥6 required)
- `cleargate-planning/CLAUDE.md`: **8 hits** (≥6 required)

All required halt rules preserved:
- [x] Gate 4 close-ack (`--assume-ack`) — L140 "Guardrails" bullet + L117 "Sprint close is Gate-4-class (CR-019)"
- [x] Triage first, draft second — L99
- [x] Brief is the universal pre-push handshake — L113
- [x] Halt at gates — L109
- [x] State-aware surface paragraph — L127
- [x] Sprint mode v1/v2 — L111
- [x] Boundary gates (CR-017) — L115
- [x] Scope reminder — L137
- [x] Project overrides — L135

## 5. Prune surface applied (per M2.md plan §"Complete prune surface")

**Live `CLAUDE.md`:**
- Deleted L59–L67: "## Agent orchestration" H2 + 4-bullet spawn block + role-contracts paragraph (9 lines)
- Deleted L121: "Architect runs twice per sprint" paragraph (1 line)
- Deleted L125: "Sprint Execution Gate." paragraph (1 line)
- Deleted L137–L141: "Four-agent loop" 5-line bullet block (5 lines)
- Deleted L145: "Orchestrator Dispatch Convention" paragraph (1 line)
- Adjacent blank lines collapsed: ~5 lines
- Inserted R2+R3+blanks: +4 lines
- Net: -18 lines (161→143)

**Canonical `cleargate-planning/CLAUDE.md`:**
- Deleted L30: "Architect runs twice per sprint" (1 line)
- Deleted L34: "Sprint Execution Gate." paragraph (1 line)
- Deleted L46–L50: "Four-agent loop" 5-line block (5 lines)
- Deleted L54: "Orchestrator Dispatch Convention" paragraph (1 line)
- Adjacent blank lines: ~4 lines
- Inserted R2+R3+blanks: +4 lines
- Net: -8 lines (70→62)

## 6. Mirror parity verification

Pre-prune baseline captured. Post-prune diff between pre/post mirror-diffs shows only:
- Removal of the "Agent orchestration" H2 block from the pre-existing diff (which lived in live L59–L67, never had a mirror in canonical — per M2 plan, this deletion does NOT violate mirror parity)
- Line-range hunk number shift (8,97d6 → 8,87d6) due to 10 fewer lines in live pre-CLEARGATE section

No new divergences inside the CLEARGATE-block were introduced.

## 7. Test file fixes

Pre-existing test `cleargate-cli/test/scripts/enforcement-section-13.test.ts` asserted `**Sprint Execution Gate.**` paragraph exists in CLAUDE.md. After prune, this assertion would fail. Updated per M2 plan: "If a pre-existing scaffold-lint test grep-asserts the deleted strings, the Developer fixes that test in the same commit."

Changes made:
- Scenario 1: Updated to assert Sprint Execution Gate paragraph is ABSENT from CLAUDE.md and skill pointer IS present (R2)
- Scenario 3: Updated to verify `**Sprint execution.**` pointer is identical in live + canonical (instead of Sprint Execution Gate)

All 9 content-related tests pass with worktree's CLAUDE.md changes applied. Scenario 5 (CLI binary preflight --help) requires a built `dist/cli.js` — not available in the worktree environment but confirmed passing in the main repo (which has the build artifacts).

## 8. §4.1 test-count override acknowledgement

Story §4.1 asserted "≥4 new grep assertions in one test file; DoD §4.1 test counts ENFORCED." Orchestrator dispatch policy overrides: ZERO new test files written. Verification is by manual recipe (M2 verification steps). The test file changes in this commit are FIX-ONLY (updating broken old assertions to match the pruned surface), not new test additions.

## 9. Typecheck status

`tsc --noEmit` in `cleargate-cli/` — CLEAN (no errors).

## 10. Smoke conversational turn (manual — not developer-runnable)

Per M2 §verification recipe Step 10: After merge, open a fresh Claude Code session; SessionStart banner should emit "Load skill: sprint-execution" (STORY-026-01 hook). Orchestrator should then invoke `Skill(sprint-execution)` before dispatching any Task(). The pruned CLAUDE.md no longer contains dispatch-convention prose; the skill is the only source. Log evidence to be supplied by orchestrator post-merge.

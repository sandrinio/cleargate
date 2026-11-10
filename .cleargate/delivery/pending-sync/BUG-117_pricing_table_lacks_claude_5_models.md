---
bug_id: BUG-117
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-43
carry_over: false
status: Draft
severity: P3-Low
reporter: orchestrator
approved: false
lane: fast
area: cli,instrumentation
context_source: "Owner, 2026-10-04: 'also make sure we're latest models. Opus 5.5 and Sonnet'. Owner chose 'Pricing table only' (agent aliases opus/sonnet/haiku already resolve to Opus 5.5 / Sonnet 5.5 / Haiku 4.5; no agent-tier change). Verified 2026-10-04: cleargate-cli/src/lib/pricing.ts and a live tsx repro; SPRINT-41 token-ledger model census. Prices from the claude-api reference model table (cached 2026-09-25)."
created_at: 2026-10-04T00:00:00Z
updated_at: 2026-10-04T00:00:00Z
created_at_version: cleargate@0.26.1
updated_at_version: cleargate@0.26.1
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-08T13:22:52Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-117
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-03T23:24:33Z
  sessions: []
---

# BUG-117: The Pricing Table Knows No Claude 5 Model, and Misprices Two It Does Know

### Open Questions

- **Question:** Add every Claude 5 model, or only the ones this repo runs?
- **Recommended:** Add the current three: Opus 5.5, Sonnet 5.5 and Fable 5.1. Opus 5.5 is the only model in the SPRINT-41 ledger, and Sonnet 5.5 is what the `sonnet` alias resolves to. Add older generations only when a ledger row needs one.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `computeUsd()` prices the models ClearGate actually runs, at current Anthropic list prices. `cleargate doctor --pricing <file>` therefore reports a real dollar figure for an item whose `draft_tokens.model` is `claude-opus-5-5`.

**Actual Behavior:** `PRICING_TABLE` (`cleargate-cli/src/lib/pricing.ts:23-48`) has four entries: `claude-opus-4-7`, `claude-sonnet-4-5`, `claude-sonnet-4-6` and `claude-haiku-4-5`. Any Claude 5 model returns `{usd: 0, unknownModel: true}`, so `doctor --pricing` prints `≈ $0.0000` with a stderr warning. 296 of the 300 most recent SPRINT-41 ledger rows carry `claude-opus-5-5`. Two of the existing entries are also wrong: `claude-opus-4-7` is priced at $15/$75 per MTok against a list price of $5/$25, and `claude-haiku-4-5` at $0.80/$4 against $1/$5.

## 2. Reproduction Protocol

1. From `cleargate-cli/`, run `npx tsx -e "import {computeUsd} from './src/lib/pricing.ts'; for (const m of ['claude-opus-5-5','claude-sonnet-5-5','claude-opus-4-7']) console.log(m, JSON.stringify(computeUsd({input:1000000,output:0,cache_read:0,cache_creation:0,model:m})))"`
2. Observe that `claude-opus-5-5` and `claude-sonnet-5-5` return `{"usd":0,"unknownModel":true}`.
3. Observe that `claude-opus-4-7` returns `{"usd":15,...}` for one million input tokens, three times its list price.

## 3. Evidence & Context

```
$ npx tsx -e "...computeUsd({input:1000000,...,model:m})..."
claude-opus-5-5 {"usd":0,"unknownModel":true}
claude-sonnet-5-5 {"usd":0,"unknownModel":true}
claude-opus-4-7 {"usd":15,"unknownModel":false}

$ tail -n 300 .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl | <count by model>
Counter({'claude-opus-5-5': 296, '': 4})

cleargate-cli/src/lib/pricing.ts:4   * Numbers from Anthropic public pricing as of 2026-04-19.
cleargate-cli/src/commands/doctor.ts:969-973  computeUsd(...) → unknownModel → stderr warning, usd 0
```

Correct table (USD per 1M tokens). The input and output prices and the stated cache-read prices come from the claude-api reference model table, cached 2026-09-25. Cache creation is the 5-minute write at 1.25× input, the multiplier the existing table already uses. Any cache read the reference does not state is 0.1× input.

| Model | input | output | cache_read | cache_creation |
|---|---|---|---|---|
| `claude-opus-5-5` | 4.00 | 20.00 | 0.20 | 5.00 |
| `claude-sonnet-5-5` | 2.00 | 10.00 | 0.20 | 2.50 |
| `claude-fable-5-1` | 10.00 | 50.00 | 0.25 | 12.50 |
| `claude-opus-4-7` | 5.00 | 25.00 | 0.50 | 6.25 |
| `claude-sonnet-4-6` | 3.00 | 15.00 | 0.30 | 3.75 |
| `claude-sonnet-4-5` | 3.00 | 15.00 | 0.30 | 3.75 |
| `claude-haiku-4-5` | 1.00 | 5.00 | 0.10 | 1.25 |

Agent model tiers are out of scope. `.claude/agents/*.md` already use the `opus`/`sonnet`/`haiku` aliases, which resolve to the current generation.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/pricing.ts` — table rows, header comment date and source line.
- `cleargate-cli/test/lib/pricing.node.test.ts` — pins the old constants; update it to the table above.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli run test:file -- test/lib/pricing.node.test.ts`

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One lookup path; unknown-model path is unchanged and already tested. |
| Interfaces | F | One caller (`doctor --pricing`), unchanged. |
| Data | T | One row per model in the table drives the result. |
| Rules | T | An unknown model still returns unknownModel: true. |

```gherkin
Feature: The pricing table knows current models

  @data
  Scenario Outline: Current models are priced at list price
    Given draft_tokens with 1,000,000 input tokens and nothing else
    When computeUsd runs for <model>
    Then usd equals <input_price> and unknownModel is false

    Examples:
      | model             | input_price |
      | claude-opus-5-5   | 4           |
      | claude-sonnet-5-5 | 2           |
      | claude-fable-5-1  | 10          |
      | claude-opus-4-7   | 5           |
      | claude-haiku-4-5  | 1           |

  @rules
  Scenario: An unknown model is still reported, not guessed
    Given draft_tokens whose model is "claude-unknown-9"
    When computeUsd runs
    Then it returns usd 0 and unknownModel true
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | Five outline rows plus the unknown-model case, in the existing pricing test file. |
| Integration tests | 0 | Pure function; no I/O. |
| E2E / acceptance tests | 0 | `doctor --pricing` behaviour is covered by the unit cases through its single call site. |

---

## Prior work

- none found — no prior item touches `pricing.ts` since STORY-008-06 created it.

## Context Source

**context_source:** the owner's 2026-10-04 request (quoted in frontmatter), the live tsx reproduction above, the SPRINT-41 ledger census, and the claude-api reference model table cached 2026-09-25.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.

---
role: architect
cr: CR-032
sprint: SPRINT-21
milestone: M2
wave: W2
commit: bc95ef1
worktree: .worktrees/CR-032
date: 2026-05-04
verdict: PASS
---

# CR-032 Architect Post-Flight Review

Surface Gate Failures + Literal-Criterion Rule. Reviewed against M2 plan
(`.cleargate/sprint-runs/SPRINT-21/plans/M2.md` §CR-032), CR-032 anchor spec
(`.cleargate/delivery/pending-sync/CR-032_*.md` §§3–4), Dev report
(`reports/CR-032-dev.md`), and QA report (`reports/CR-032-qa.md`).

---

## 1. M2 Plan Compliance — Template Count

**Architect override in M2 plan §CR-032:** apply preamble to 5 templates × 2
mirrors = 10 files (Bug, CR, epic, hotfix, story; live + canonical). Skip
`initiative.md` (stakeholder artifact), Sprint Plan Template (no compatible
checklist), `proposal.md` (does not exist).

**Verification — `git show bc95ef1 --stat | grep templates`:**

```
.cleargate/templates/Bug.md                       | 2 +
.cleargate/templates/CR.md                        | 2 +
.cleargate/templates/epic.md                      | 2 +
.cleargate/templates/hotfix.md                    | 2 +
.cleargate/templates/story.md                     | 2 +
cleargate-planning/.cleargate/templates/Bug.md    | 2 +
cleargate-planning/.cleargate/templates/CR.md     | 2 +
cleargate-planning/.cleargate/templates/epic.md   | 2 +
cleargate-planning/.cleargate/templates/hotfix.md | 2 +
cleargate-planning/.cleargate/templates/story.md  | 2 +
```

**Count: 10/10. PASS.** No drift from Architect override; QA's count confirmed.

**Bonus surface — npm payload mirror.** `cleargate-cli/templates/cleargate-planning/.cleargate/templates/{5 files}` synced via prebuild (per `MANIFEST.json` SHA delta in commit). 5/5 pairs byte-identical to canonical (`diff` empty). Not in M2 plan's 10-file count but required by the npm publish chain — Dev correctly let `npm run prebuild` mirror them automatically. No drift.

---

## 2. Stdout Capture (M2 plan §Risk 3 — preferred implementation)

M2 plan recommended the **simpler implementation**: capture `cleargate gate
check` stdout to a tmpfile, grep `^❌`, sed-transform to `⚠️ gate failed:`.

**Verification — `cleargate-planning/.claude/hooks/stamp-and-gate.sh` lines 27–39:**

```bash
# CR-032: capture gate check stdout to tmpfile so we can re-emit ⚠️ lines to
# hook stdout (→ Claude Code system-reminder). gate.ts emits ❌ lines to
# stdout (gate.ts:259), not stderr; the tmpfile captures them separately.
GATE_OUT=$(mktemp)
"${CG[@]}" gate check "$FILE" >"$GATE_OUT" 2>>"$LOG"
SR2=$?
cat "$GATE_OUT" >>"$LOG"
if [ "$SR2" -ne 0 ]; then
  WORK_ITEM_ID=$(grep -m1 -oE '(EPIC|STORY|CR|BUG|HOTFIX|PROPOSAL|INITIATIVE|SPRINT)-[0-9]+(-[0-9]+)?' "$FILE" | head -1)
  : "${WORK_ITEM_ID:=<work-item>}"
  grep '^❌' "$GATE_OUT" 2>/dev/null | sed -E "s/^❌ /⚠️ gate failed: ${WORK_ITEM_ID} — /"
fi
rm -f "$GATE_OUT"
```

**Findings:**
- ✅ tmpfile captures `gate check` stdout directly (line 31 — `>"$GATE_OUT"`).
- ✅ stderr still routed to log (`2>>"$LOG"`); log invariant preserved.
- ✅ Tmpfile contents appended to log post-emit (line 33) — auditability intact.
- ✅ `^❌` grep reads from tmpfile, not log — avoids log-pollution-blast scoped to one fire.
- ✅ Emission via plain `grep | sed` to bash stdout — Claude Code injects as system-reminder per CR-032 §1.A spec.
- ✅ `if [ "$SR2" -ne 0 ]` guard ensures pass-case stays quiet (M2 §Risk acceptance #4).
- ✅ `rm -f "$GATE_OUT"` cleanup (line 39) — no tmpfile leak.
- ✅ `awk` UTF-8 byte-portability concern from M2 plan §Risk 3 sidestepped by using portable `grep '^❌'` + `sed`.
- ✅ Resolver order unchanged (lines 12–18, three-branch CR-009); new block lives between `gate check` and `wiki ingest` — CR-009 contract preserved.

**Stdout-capture mechanism: confirmed per M2 plan §Risk 3 preferred variant.**

---

## 3. Mirror Parity

### 3.1 CLAUDE.md — live ↔ canonical (CLEARGATE block only)

**Live `CLAUDE.md` line 126** (within block lines 101–158):
```
**Ambiguity Gate criteria are evaluated literally.** Each `[ ]` box in a work-item's Ambiguity Gate footer must be evaluated against the literal criterion text...
```

**Canonical `cleargate-planning/CLAUDE.md` line 32** (within block lines 7–64):
```
**Ambiguity Gate criteria are evaluated literally.** Each `[ ]` box in a work-item's Ambiguity Gate footer must be evaluated against the literal criterion text...
```

**Pre-existing outside-block divergence:** Live CLAUDE.md carries the
ClearGate meta-repo preamble (lines 1–99: "ClearGate Meta-Repo", repo
layout, dogfood split, active state, stack versions, conversational-agent
guardrails) above the CLEARGATE block. Canonical carries only the
"injected CLAUDE.md block" header (lines 1–6). This divergence is
intentional and pre-existing — the canonical file is the npm-payload
injection target, the live file is the meta-repo's own self-instruction.
**Per CR-032 §3 spec ("byte-equal where the bounded ClearGate block
applies"), parity is per-block, not whole-file.**

The new literal-rule paragraph lands inside the bounded block at the same
logical position in both files (immediately above `**Brief is the
universal pre-push handshake.**`). New paragraph text byte-identical
across both ends — confirmed via `template-claude-md.test.ts` Scenario 3
which extracts the paragraph block from both files and asserts equality.

**CLAUDE.md mirror parity: PASS** (per-block, intentional outside-block
divergence preserved).

### 3.2 Five template pairs

```
$ for t in Bug.md CR.md epic.md hotfix.md story.md; do
    diff -u .cleargate/templates/$t cleargate-planning/.cleargate/templates/$t \
      && echo "OK: byte-equal"; done
=== Bug.md ===    OK: byte-equal
=== CR.md ===     OK: byte-equal
=== epic.md ===   OK: byte-equal
=== hotfix.md === OK: byte-equal
=== story.md ===  OK: byte-equal
```

5/5 pairs whole-file byte-identical. **PASS.**

Bonus npm payload (`cleargate-cli/templates/cleargate-planning/.cleargate/templates/`):
5/5 byte-identical to canonical via `prebuild` mirror. Not required by M2
plan but verified clean.

### 3.3 stamp-and-gate.sh — canonical vs npm payload

**Important note on M2 plan §2.3 expectation.** The M2 plan called for
diffing live (`.claude/hooks/stamp-and-gate.sh`) against canonical
(`cleargate-planning/.claude/hooks/stamp-and-gate.sh`) with the CR-009
divergence preserved. **The live `.claude/` directory is gitignored**
(`.gitignore:13` — `/.claude/`). Only `.claude/hooks/token-ledger.sh` is
tracked (a per-project exception via `git add -f`). The live
`stamp-and-gate.sh` does not exist as a tracked file in this worktree.

The "two mirrors" tracked in this commit are:
1. `cleargate-planning/.claude/hooks/stamp-and-gate.sh` (canonical)
2. `cleargate-cli/templates/cleargate-planning/.claude/hooks/stamp-and-gate.sh` (npm payload, auto-generated by `prebuild`)

`diff` between (1) and (2): empty (`exit=0`). Both carry the new gate-fail
emission block at lines 27–39, with the CR-009 three-branch resolver at
lines 7–18. **PASS.**

**The pre-existing CR-009 divergence (M2 plan §FLASHCARD 2026-05-01
#mirror #parity) referred to live ↔ canonical**, where live carries the
old two-branch resolver and canonical carries the three-branch. Since
live is gitignored and per-machine, the canonical-side commit is the only
authoritative tracked artifact. The user must `cleargate init` (or hand-
port) post-merge to refresh the live instance — same dogfood-split rule
as every other canonical edit (per `CLAUDE.md` "Dogfood split" section).
**This is a manual-sync step, not a CR-032 defect.**

### 3.4 Snapshot locks

`cleargate-cli/test/snapshots/hooks/stamp-and-gate.cr-008.sh` and
`stamp-and-gate.cr-009.sh` both updated to include the new gate-fail
emission block. Both snapshots now byte-identical to canonical at lines
1–43 (verified by Read). Per M2 plan flashcard `2026-05-02 #snapshot
#hooks` guidance: byte-equal lock + supersede assertion in same commit.
Both files updated in `bc95ef1`. **PASS.**

**Mirror parity verdict: ok** (per-block / per-edit; tracked surfaces all
clean; live re-sync is a downstream user action governed by the dogfood-
split rule, not a parity defect).

---

## 4. Bootstrap Recursion Mitigation (M2 plan §Risk 1)

CR-032 is the chat-injection bedrock — until it merges to `sprint/S-21`,
gate failures stay silent. M2 plan §Risk 1 mitigation: orchestrator
manually tails `.cleargate/hook-log/gate-check.log` after each Dev tool
call.

**Verification:**
- The new gate-fail emission block (lines 34–38) fires on **any** PostToolUse Write/Edit under `.cleargate/delivery/**` (line 22 path filter unchanged).
- The block's only conditional is `if [ "$SR2" -ne 0 ]`, which triggers on any `cleargate gate check` non-zero exit. Behavior is independent of work-item type, sprint state, or branch.
- Pass-case quiet (M2 plan §4 acceptance #4): when `SR2 == 0`, no `⚠️` line emitted (only the existing log entry + ingest). Confirmed by bash test Case 2 (per QA report).
- Detail preservation (M2 plan §4 acceptance #3): the `sed` transform replaces only the `❌ ` prefix; the criterion-id + detail text follow verbatim. Confirmed by bash test Case 3.
- Work-item ID extraction (M2 plan §4 acceptance unspecified, anchor §1.A line 117 example): `grep -m1 -oE` regex matches the first ID-shaped string in the file body — covers H1 headings (`# CR-032: ...`) and frontmatter ID keys. Confirmed by bash test Case 4.

**Once `bc95ef1` merges to `sprint/S-21` and the user re-syncs the live
instance via `cleargate init` (or hand-ports the hook), gate-fail
visibility is wired and self-sustaining for the rest of SPRINT-21 W3+.
The orchestrator's manual hook-log scan workaround (M2 plan §Risk 1)
becomes obsolete from that point.**

**Bootstrap mitigation: confirmed.**

---

## 5. CLEARGATE Tag Boundary

**Live `CLAUDE.md` block markers:**
- `<!-- CLEARGATE:START -->` at line 101
- `<!-- CLEARGATE:END -->` at line 158
- New paragraph at line 126 — **inside the block**.

**Canonical `cleargate-planning/CLAUDE.md` block markers:**
- `<!-- CLEARGATE:START -->` at line 7
- `<!-- CLEARGATE:END -->` at line 64
- New paragraph at line 32 — **inside the block**.

Both edits land strictly inside the bounded `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` region. No content outside the block was modified in this commit. **PASS.**

---

## 6. Pre-Existing Test Failures

QA reported 20 full-suite failures (1592 passed / 20 failed / 28 skipped =
1640 total), all confirmed pre-existing on `sprint/S-21`. Buckets per QA
report §"Pre-existing failures":

1. `gate.test.ts` — BUG-008 smoke (yaml block count drift from W1 CR-034)
2. `pre-tool-use-task.test.ts` (×11) — canonical path mismatch from prior sprint
3. `cr-026-integration.test.ts` (×1) — same pre-existing root cause
4. `agent-developer-section.test.ts` (×1) — developer.md mirror mismatch
5. `gate-run.test.ts` (×1) — agent wording assertion
6. `hotfix-new.test.ts` (×2) — hotfix-ledger wiki section
7. `snapshot-drift.test.ts` (×1) — Zod schema snapshot
8. `test_version_bump_alignment.test.ts` (×2) — `mcp/package.json` absent
9. `bootstrap-root.test.ts` — 23 skipped (collection error, `mcp/package.json` missing)

**Architect verification.** QA performed
`git diff sprint/S-21..bc95ef1 -- cleargate-cli/test/ --name-only`,
returning only the 2 new CR-032 test files
(`test_stamp_and_gate.sh`, `template-claude-md.test.ts`). None of the 20
failing test files were modified by `bc95ef1`. The failure inventory
matches the residual failure surface inherited from W1 close-out and
prior sprints (BUG-008 yaml-block count was introduced by CR-034 in W1 of
this sprint; the others predate SPRINT-21).

**New CR-032 tests:**
- 4/4 bash scenarios in `test_stamp_and_gate.sh` — all green per QA.
- 18/18 TS scenarios in `template-claude-md.test.ts` — all green per QA. (M2 plan called for ≥3 TS scenarios; Dev shipped 18 covering 5 templates × 2 mirrors + scenario-level granularity. Over-delivered. Acceptable.)

**Concur with QA: 20 pre-existing failures are not CR-032-caused. No
push-back.** The pre-existing inventory is a SPRINT-22 cleanup target
(the BUG-008 yaml-count case was already noted in W1 close-out). None
block CR-032 merge.

---

## 7. Pre-Gate False-Positive (per orchestrator note)

Pre-gate scan reported `[FAIL] typecheck: exit code 1`. Confirmed
false-positive: the meta-repo root has no `package.json` `typecheck`
script — only the `cleargate-cli/` and `mcp/` subpackages do. QA ran
`npm run typecheck` (correct invocation) at exit 0 with no errors.
**Ignored per orchestrator instruction. Not a CR-032 defect.**

---

## 8. Acceptance Criteria Trace (CR-032 §4)

| §4 # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Failure A reproduces pre-CR | PASS (regression baseline, no new code) | Anchor §4.1 |
| 2 | Failure A fixed — `⚠️ gate failed:` in next turn | PASS | Hook lines 27–39; bash test Case 1 |
| 3 | Failure B mitigation — `grep "Ambiguity Gate criteria are evaluated literally" CLAUDE.md` returns ≥1 | PASS | 1 match each in live (L126) + canonical (L32) |
| 3 cont. | `grep "Evaluate each criterion against its literal text" .cleargate/templates/*.md` returns 5 | PASS (Architect override: 5 not 7) | 5 matches in live + 5 in canonical |
| 4 | Pass case stays quiet | PASS | `if [ "$SR2" -ne 0 ]` guard; bash test Case 2 |
| 5 | End-to-end re-test | DEFERRED to post-merge manual smoke | Per M2 plan QA scope |
| 6 | Scaffold mirrors empty diff | PASS | 5 template pairs + npm payload pairs all byte-equal; CLAUDE.md per-block parity; stamp-and-gate.sh canonical ↔ npm-payload identical |

All in-scope acceptance criteria satisfied. §5 (end-to-end manual smoke)
is operator action post-merge, out of scope for QA/Architect automated
review.

---

## 9. Flashcards Flagged for Append

Worth recording for future sprints:

1. **`#hooks #stdout #system-reminder` (2026-05-04)** — "PostToolUse hook stdout becomes a Claude Code system-reminder in the next turn. To surface gate failures, capture `gate check` stdout to a tmpfile (`>"$GATE_OUT"`), grep `^❌`, sed-transform, emit to bash stdout. Stderr-only routing kills the signal." (Reinforces existing `2026-04-26 #hooks #bash #exit-capture` card with concrete tmpfile pattern.)

2. **`#mirror #parity #npm-payload` (2026-05-04)** — "stamp-and-gate.sh has THREE tracked locations: canonical (`cleargate-planning/.claude/hooks/`), npm payload (`cleargate-cli/templates/cleargate-planning/.claude/hooks/`), and live (`.claude/hooks/`, gitignored). Only canonical + npm payload are tracked; npm payload auto-syncs via `npm run prebuild`. Live is per-machine, refreshed by `cleargate init`. Mirror-parity reviews verify 2 tracked surfaces, not 3."

3. **`#cleargate-block #per-block-parity` (2026-05-04)** — "Live `CLAUDE.md` and canonical `cleargate-planning/CLAUDE.md` share the bounded `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block byte-for-byte but the live file carries an outside-block meta-repo preamble (repo layout, dogfood split, etc.) that canonical does not. Whole-file diff will always show drift; parity is per-block by design (CR-032 §3 'byte-equal where the bounded ClearGate block applies')."

4. **`#test-coverage #over-delivery` (2026-05-04)** — "M2 plan called for ≥3 TS scenarios; Dev shipped 18 (5 templates × 2 mirrors × 2 phrase-presence checks + 3 parity blocks). Over-delivery on test breadth is fine when scenarios are mechanical and the assertions are independent. The cost is execution-time + brittleness on intentional template surface changes."

These are **flagged**, not appended — the conversational orchestrator owns FLASHCARD.md edits per Architect agent guardrails. Recommend appending #1, #2, #3 (most useful for future hook/mirror work). #4 is borderline — append only if scope creep on test scenarios becomes a recurring pattern.

---

## 10. Verdict

All M2 plan compliance points met. Stdout capture wired per the preferred
implementation. Mirror parity clean across all tracked surfaces (5
template pairs × 2 ends + npm payload + CLAUDE.md per-block + 2 snapshot
locks). Bootstrap recursion mitigation confirmed via post-merge hook
behavior. CLEARGATE tag boundaries respected. Pre-existing test failures
correctly attributed.

**One operator action required post-merge:** user runs `cleargate init`
(or hand-ports `.claude/hooks/stamp-and-gate.sh`) to refresh the live
instance. Without this step, the live hook continues to swallow gate
failures silently — same dogfood-split rule that bit BUG-024 (per
CLAUDE.md "Dogfood split" section). This is a downstream sync action,
not a CR-032 defect.

**Ready to merge to `sprint/S-21`.**

---

ARCH: PASS
SCOPE_COMPLIANCE: 10/10 templates
MIRROR_PARITY: ok
BOOTSTRAP_MITIGATION: confirmed
flashcards_flagged: [#hooks #stdout #system-reminder, #mirror #parity #npm-payload, #cleargate-block #per-block-parity]

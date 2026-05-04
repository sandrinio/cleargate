# CR-039 Architect Post-Flight Review (Spike)

**Reviewer:** Architect agent (read-only, ≤10-min budget)
**Commit:** `cc6254f` on `story/CR-039`
**Scope:** Spike memo + dev report only. No code under review.
**Verdict:** **PASS** — recommendation soundness contested (concur-PARTIAL with caveat that NO-GO is also defensible; see §3).

---

## 1. SDK Support Claim — VERIFIED

Dev claims Claude Code's Agent/Task tool has no `session_id` override; all subagents inherit the orchestrator's `session_id`. Two-source check:

- **Empirical:** SPRINT-21 ledger = 26 rows / 1 unique session_id (`fd518f2c-…`). SPRINT-20 ledger = 19 rows / 1 unique session_id (`7cc0804d-…`). Confirmed via `jq`-equivalent parse of both ledgers.
- **Code:** `cleargate-planning/.claude/hooks/token-ledger.sh` L75: `SESSION_ID="$(printf '%s' "${INPUT}" | jq -r '.session_id // empty')"`. The hook receives session_id from the SubagentStop payload; no parameterization on the dispatch site. Memo's L28 citation is accurate.
- **Reasoning gap:** none material. Dev did not enumerate Anthropic SDK-level Agent options to prove no hidden parameter exists, but the ledger evidence is dispositive — if a per-dispatch override existed and orchestrators were using it, SPRINT-20/21 ledgers would show distinct session_ids per agent. They don't.

**Architect concur: SDK gap claim is sound.**

## 2. Cost Framing — DIRECTIONALLY CORRECT, OFF BY ~2X ON DOLLARS

Dev's memo is internally inconsistent. The Executive Summary says "~$1.60/sprint" (L14), then §"Dollar Cost Analysis" (L80) says "~$0.70/sprint." The dev report (L11, L33) settles on $0.70. Either way, the order of magnitude is right; the absolute number is wrong because of how the math was done.

Recompute at Sonnet 4.6 prices (publicly published as of 2026-05-03):
- Input: $3.00 / MTok
- Cache write (1.25x): $3.75 / MTok
- Cache read (0.10x): $0.30 / MTok
- Output: $15.00 / MTok

Saving side: 16M cache_read tokens × $0.30/MTok = **$4.80/sprint**.
New cost side: 1.7M cache_creation × $3.75/MTok = **$6.38/sprint**.
**Net: NEGATIVE ~$1.58/sprint** (fresh sessions cost more, not less, in dollars).

This flips the direction of the dollar argument. The Dev's memo treats the 1.25x:0.10x ratio as the only multiplier (12.5x) and concludes "small net positive" — but the absolute dollar saving from cache_read reduction is offset by the absolute dollar cost of new cache_creation, which is 12.5x more expensive per token. Per the memo's own table: 1.7M cache_creation × 12.5 = 21.25M token-equivalents, vs 16M cache_read saved. Net = NEGATIVE in token-equivalent input-price terms.

**Conclusion: dollar cost framing is OFF, and the sign may flip.** Even at Haiku-tier pricing the multiplier ratio is identical, so the conclusion is model-independent. Memo's "~$0.70/sprint saved" is wrong; the realistic figure is "~$1.50/sprint additional spend, with 16M token-count reduction."

This strengthens, not weakens, the case against implementation: the spike's primary justification (modest savings) doesn't survive a price-aware recomputation. The 16M token-count reduction is real but does not translate to dollar savings.

**Cost framing assessment: directionally correct on token-count; sign-incorrect on dollars.**

## 3. PARTIAL Recommendation Soundness — CONTESTED

The Architect view differs from Dev's PARTIAL by the price-flip in §2. Three options to weigh:

**Concur-PARTIAL (Dev's call):** defensible on the grounds that 16M tokens is real and may compound under context-window pressure (per §4 below). PARTIAL preserves optionality without burning SPRINT-22 capacity now.

**Should-be-NO-GO:** strongest case after price recomputation:
- Dollar impact is near-zero or negative (§2).
- Implementation cost is 2-4 dev-days = 16-32 hours of orchestrator/Claude API token spend ≈ $50-150 (orders of magnitude above the saving).
- Payback period is infinite if the dollar sign is negative; even at Dev's $0.70 estimate, payback is 70-200 sprints.
- SubagentStop incompatibility is a hard blocker that requires re-architecting the attribution pipeline — high risk for low payoff.

**Should-be-GO:** only if token-count compounding is the primary concern (see §4). Not justified by this memo alone.

**Architect verdict:** PARTIAL is acceptable but borderline. NO-GO with the memo as a permanent cost-ceiling reference is the stronger ROI call. The Dev's choice to file as CR-041 (per §"If GO is pursued in SPRINT-22") materially defers cost — that's effectively NO-GO with optionality, which is fine.

**Recommendation: concur-PARTIAL with the explicit understanding that CR-041 should require fresh ROI justification before opening — not just "the spike said GO eventually."**

## 4. Token-Count Framing — UNDERWEIGHTED

Dev's memo focuses on dollar cost. The token-count reduction (16M = 27% of dev+QA total) has a second-order effect Dev did not quantify:

- **Context-window pressure:** Sonnet's 1M-context tier helps, but per-turn KV cache reads scale linearly with cumulative session size. A 4-story sprint hits ~25M cumulative tokens; an 8-story sprint hits ~64M. At some N, cache_read latency dominates and dispatches stall.
- **The CR-030 QA 2.3hr hang precedent:** observed in SPRINT-20 — that hang's root cause was never definitively pinned, but cumulative session size in a v1 dispatch chain is a candidate. If session reset cuts hang frequency by even 10%, the value (recovered dev time) dwarfs the $1.50/sprint API cost.
- **Memo silence:** Dev does not quantify hang risk. The flashcard #3 about reporter.md inaccuracy implies awareness but the memo's recommendation prose doesn't factor hang prevention into the GO/PARTIAL/NO-GO call.

**Architect view:** if the human cares about hang prevention more than dollar cost (and the SPRINT-20 evidence suggests they should), the GO case strengthens. The memo's PARTIAL doesn't capture this; the recommendation should be re-evaluated with hang-frequency data from the next 2-3 sprints before CR-041 opens.

**Action:** add hang-correlation as an open question in the CR-041 pre-draft scope.

## 5. Out-of-Scope Verification — PASS

`git show --stat cc6254f` returns exactly 2 files:
- `.cleargate/sprint-runs/SPRINT-21/reports/CR-039-dev.md` (+36)
- `.cleargate/sprint-runs/SPRINT-21/spikes/CR-039_session_reset_memo.md` (+197)

No production code, no agent file, no hook, no skill, no orchestrator script. Spike charter §3 honored.

**Verdict: PASS.**

## 6. Reporter.md "Fresh Session" Inaccuracy — SEPARATE CR

Confirmed: `cleargate-planning/.claude/agents/reporter.md` L108 contains the literal text:

> the `Task` tool already creates a new conversation per dispatch — verify the dispatch payload contains no `--resume` or session continuation flag

This is contradicted by the SPRINT-20/21 ledger evidence (1 session_id per sprint across all dispatches including Reporter). The reporter dispatch is in fact NOT in a fresh session — measurement shows otherwise.

**Why this matters:** the Reporter token-diet work (CR-035/CR-036) operates on the assumption that the Reporter starts cold. If it doesn't, the diet is leakier than designed, and the 13M-token Reporter cost flagged in CR-039's context_source may not be fully attributable to Reporter prompt content — some fraction is inherited dev+QA cache.

**Fix-inline vs separate-CR:** SEPARATE CR. Reasoning:
1. The fix is not a one-line correction — it requires deciding whether to (a) actually make Reporter dispatch fresh-session-equivalent (which is the same SubagentStop blocker as CR-039 itself) or (b) reword reporter.md to acknowledge shared-session reality and adjust the diet's expectations accordingly.
2. Option (a) is in-scope for the deferred CR-041 and should bundle with it.
3. Option (b) is a doc-only CR that should run independently and quickly.
4. Inline-fixing in CR-039's spike commit would expand scope beyond the spike charter (§3 explicitly excludes prod surfaces including agent files).

**Recommendation:** file CR-042 (doc-only, ≤1 day) to either correct the reporter.md wording OR upgrade the Reporter dispatch to actually run fresh-session via subprocess. The choice depends on CR-041's resolution.

**Verdict: separate CR — preferably CR-042, gated on CR-041's GO/NO-GO decision.**

## 7. Open Decisions for Orchestrator

Architect does NOT decide:
1. Whether to file CR-041 now (defer-with-pre-draft-scope) vs lock the memo as a permanent cost-ceiling reference (NO-GO).
2. Whether to file CR-042 (reporter.md doc fix) immediately or bundle with CR-041.
3. Whether to commission a hang-correlation study before CR-041 opens.

All three are orchestrator/human calls.

## 8. Flashcards Flagged

- `2026-05-03 · #cost-framing #pricing · cache_read savings ≠ dollar savings; cache_creation backfill at 1.25x can flip the sign` — propose recording.
- `2026-05-03 · #spike #recommendation · PARTIAL with deferred CR is functionally NO-GO; require fresh ROI before opening CR-041` — propose recording.
- `2026-05-03 · #docs #agent-defs · reporter.md L108 claim "Task tool creates new conversation per dispatch" contradicted by ledger; fix-pending CR-042` — propose recording.

---

ARCH: PASS
RECOMMENDATION_VERDICT: concur-PARTIAL (NO-GO is also defensible; see §3)
COST_FRAMING_OK: off-by-~2x (dollar sign may flip; token-count direction correct)
OUT_OF_SCOPE: pass
REPORTER_DOC_BUG: separate CR (file as CR-042, gated on CR-041)
flashcards_flagged: [#cost-framing #pricing, #spike #recommendation, #docs #agent-defs]

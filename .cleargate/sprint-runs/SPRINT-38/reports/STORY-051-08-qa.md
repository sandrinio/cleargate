---
story: "STORY-051-08"
sprint: "SPRINT-38"
wave: "4"
agent: "qa"
mode: "verify"
verdict: "PASS"
acceptance_coverage: "5 of 5"
transcribed_by: "orchestrator"
transcription_note: ">"
  The qa agent definition does not write a success-path report file; it returns
  the report as text. DevOps (§C.7) requires STORY-NNN-NN-qa.md before merge.
  Transcribed by the orchestrator from the agent's returned verdict.
story_id: "STORY-051-08"
sprint_id: "SPRINT-38"
qa_bounces: "0"
arch_bounces: "1"
---

# STORY-051-08 — QA report

## QA-Red (earlier in wave 4)

`QA-RED: WRITTEN` · one file: `cleargate-cli/test/scripts/close-sprint-assume-ack-guard.node.test.ts`
(393 lines, committed `377ad1c`). Baseline **18 of 20 legs red**; cases 2 and 3 are intentional
regression legs, verified genuinely green against the unmodified pipeline (real spawn, state read
back — not vacuous passes). Section-body assertions anchor on literal heading text via
`content.indexOf`, not line numbers.

## QA-Verify

```
QA: PASS
ACCEPTANCE_COVERAGE: 5 of 5 scenarios
MISSING: none
REGRESSIONS: none
DOGFOOD_PARITY: ok
```

- **Guard placement** — `close_sprint.mjs:179` gates on `args.includes('--assume-ack')`, not the
  `assumeAck` variable (`:177` unchanged); exit 2; both tiers byte-identical.
- **AD#3 wording verbatim at all four doc sites** (enforcement §12.3 `:461-463`, canonical
  `CLAUDE.md` ×2, root `CLAUDE.md` ×2) — no paraphrase.
- **§15** — contains `story-file assertion`, `does NOT soften`, `file-surface`, `decomposition`,
  `lifecycle-init`; zero hits for `all gate failures in the CLI`; no bare "preflight-only" underclaim.
- **AD#2 scope discipline** — §14.1/§14.2 collapsed, `**Test seams:**` bullets unchanged, and the
  five carry-over v1/v2 lines (`:248`, `:329`, `:388`, `:398`, `:414`) byte-identical to pre-story
  content (over-scrubbing would have been a defect).
- **Dogfood parity** — canonical↔live diff clean on all three shared files; zero touches to
  `/.claude/**`, `MANIFEST.json`, `cleargate-cli/templates/**`.
- **G8-8** — `sprint not closed` prefix byte-identical; `cli.ts` `.option('--assume-ack', '…')`
  still matches the asserting regex (no apostrophe introduced).
- **Deferred-verify test** — live-root 6/6; canonical 5/6, Scenario 5 failing on the pre-existing
  doubled-path bug documented in M2 grounding notes. Scenarios 1-4 unchanged in both copies.

## Test runs

- `npx tsc --noEmit -p .` in `cleargate-cli/` — clean.
- Guard test with `CLEARGATE_META_ROOT=<worktree>` — 18/20; the 2 ENOENT doc legs pass against the
  real cli checkout today and were independently confirmed to pass with no override, so they resolve
  post-merge.
- Full suite `npm --prefix cleargate-cli test` — **2148 passed / 16 failed / 1 skipped** (2165).
  All 16 enumerated and confirmed to live in the new guard test only, red solely because the
  outer-main checkout has not merged the story. Zero failures elsewhere.
- `npm run test:integration` — 330 passed / 47 failed / 35 cancelled, a large pre-existing baseline
  (admin bootstrap needs live Postgres, EPIC-028 codemod tests reference a deleted script, stale
  SPRINT-28 fixtures). The two failures inside the assume-ack blast radius were reproduced against
  the pre-story commit — pre-existing, not regressions.

## Flashcards flagged

- `2026-07-27 · #test-harness #qa-red · anchor doc-coherence assertions on literal heading text (content.indexOf), not line numbers — Architect-cited line numbers drift across sibling-story edits within the same wave.`
- `2026-07-27 · #test-harness #cross-repo · cleargate-cli npm run test:integration carries ~47 pre-existing unrelated failures — not a per-story regression gate; spot-verify against the pre-story commit before blaming a diff.`

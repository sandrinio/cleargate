# Orientation eval evidence

- Label: release (gating model)
- Started: 2026-11-12T19:33:45.570Z
- Model: claude-opus-5-5
- Ref: main
- Tarball sha256: 9ac9cd21b0b603d76f6f5f9b17017556d66aa0db9697af78237b924fd26672e1
- orientation-questions.json sha256: 8f158792e845150ff4972e79c35b3e7fbd7c217e0c25461ad5b7abad09b5c55e
- Corpus tree sha256: bdbae52a545ccf8380a52d21dc5587911090fde5887b007d617284139bfe865a
- container: cg-orient-release-0300-r2
- cli_sha: 084078375d887eb92a910b5521a26672ee38977b
- artifact: cleargate-0.30.0.tgz
- cleargate resolved: cleargate
- claude: 2.1.322 (Claude Code)
- prompt framing: Answer from what you were given at session start where it covers the question; use tools only for what it does not cover.
- limits: max-turns 8 · max-budget-usd 2 · timeout 300000 ms per session

VERDICT: FAIL

| Q | kind | correct | tokens found | tool calls | skill calls | hook ok | transcript | actual model |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| q01 | brief | yes | SPRINT-9 | 0 | 0 | true | transcripts/orientation-eval.q01.jsonl | claude-opus-5-5 |
| q02 | brief | yes | SPRINT-08, Shipped | 0 | 0 | true | transcripts/orientation-eval.q02.jsonl | claude-opus-5-5 |
| q03 | brief | yes | BUG-12, BUG-13, BUG-15, STORY-008-05 | 0 | 0 | true | transcripts/orientation-eval.q03.jsonl | claude-opus-5-5 |
| q04 | brief | yes | SPRINT-10, SPRINT-11 | 0 | 0 | true | transcripts/orientation-eval.q04.jsonl | claude-opus-5-5 |
| q05 | brief | yes | BUG-22, CR-098-Legacy-Hyphen-Slug, CR-130, EPIC-22, SPRINT-08 | 3 | 0 | true | transcripts/orientation-eval.q05.jsonl | claude-opus-5-5 |
| q06 | brief | yes | BUG-20, BUG-21, BUG-25 | 0 | 0 | true | transcripts/orientation-eval.q06.jsonl | claude-opus-5-5 |
| q07 | brief | yes | CR-130, EPIC-20, CR-14, EPIC-23 | 0 | 0 | true | transcripts/orientation-eval.q07.jsonl | claude-opus-5-5 |
| q08 | brief | yes | v0.0.1 | 0 | 0 | true | transcripts/orientation-eval.q08.jsonl | claude-opus-5-5 |
| q09 | page | yes | EPIC-23 | 1 | 0 | true | transcripts/orientation-eval.q09.jsonl | claude-opus-5-5 |
| q10 | page | yes | CR-130, BUG-26, CR-099 | 3 | 0 | true | transcripts/orientation-eval.q10.jsonl | claude-opus-5-5 |
| q11 | page | yes | rollup counter | 2 | 0 | true | transcripts/orientation-eval.q11.jsonl | claude-opus-5-5 |
| q12 | page | yes | CR-099 | 2 | 0 | true | transcripts/orientation-eval.q12.jsonl | claude-opus-5-5 |

## Answers

- q01: **SPRINT-9** is the active sprint. Its goal is "Ship the session brief so a fresh orchestrator starts oriented." ⏎  ⏎ - **Status:** Active. STORY-009-02 is at QA pass. ⏎ - **Stories (4):** 2 Done, 1 Architect Passed, 1 Ready to Bounce. ⏎  ⏎ This comes from the session brief printed at startup.
- q02: **SPRINT-08** was the most recent sprint closed, on 2026-10-05. Its report status was **Shipped**: 5 items were planned, 3 shipped and 2 carried over. ⏎  ⏎ The brief also points to a **Notes:** line in the report about late QA and carrying 2 items to the backlog, but that line is cut off in the brief. The brief separately lists SPRINT-08 as having an unfinished close checklist that is waiting on you. ⏎  ⏎ I took this from the session-start brief and didn't open the report itself.
- q03: Four carried-over items have no active or planned sprint, according to the session brief: ⏎  ⏎ - **BUG-12** ⏎ - **BUG-13** ⏎ - **BUG-15** ⏎ - **STORY-008-05** ⏎  ⏎ The brief also says SPRINT-08 carried over 2 items. The other two on this list probably came from earlier sprints. I can check each item's history if you need to know where they came from.
- q04: Two sprints are planned after the active one (SPRINT-9): ⏎  ⏎ - **SPRINT-10** has 3 items, and 2 of them are ready (🟢). ⏎ - **SPRINT-11** has 1 item, and it isn't ready yet. ⏎  ⏎ Four carried-over items have no sprint yet: BUG-12, BUG-13, BUG-15 and STORY-008-05. ⏎  ⏎ The session-start summary doesn't list which items are in each sprint. I can open the sprint files if you want that.
- q05: Six items are waiting on you: ⏎  ⏎ **Failing readiness gates (all fail `no-tbds`, meaning they still contain TBD placeholders)** ⏎ - BUG-22 ⏎ - CR-098-Legacy-Hyphen-Slug ⏎ - STORY-009-04 (this is the "+1 more" the brief cuts off; it appears on the blocked list at session start) ⏎  ⏎ **Open question** ⏎ - EPIC-22: "Which ranking signal comes first?" ⏎  ⏎ **Unlabelled contradiction** ⏎ - CR-130. I'm inferring this one: the brief names CR-130 and EPIC-22 without saying which goes with which item. EPIC-22 is the one with the open question, and CR-130's own question is already answered ("Twelve words, longer digests are cut"), so the contradiction is probably CR-130's. ⏎  ⏎ **Unfinished close checklist** ⏎ - SPRINT-08: it closed on 2026-10-05 with 2 of its 5 items carried over, and its doc-refresh checklist still has open items. ⏎  ⏎ The P0/P1 bugs are also worth a look: BUG-20 (webhook retry drops the second event), BUG-21 (login times out on slow networks) and BUG-25 (cache serves a stale page). All three are still Draft and not approved. ⏎  ⏎ SPRINT-9 is active, with STORY-009-02 at the QA-pass stage, so I can keep running it. ⏎  ⏎ ClearGate is in pre-member mode and its server didn't connect this session, so you can't push anything yet. To push approved items, send me an invite URL and run `cleargate join`.
- q06: The session brief lists 3 open bugs at P0/P1: ⏎  ⏎ - **BUG-20**: Webhook retry drops the second event ⏎ - **BUG-21**: Login times out on slow networks ⏎ - **BUG-25**: Cache serves a stale page ⏎  ⏎ The brief groups P0 and P1 together, so it doesn't say which of these are P0. I can check the bug files if you need that split.
- q07: The session brief lists these five as the latest decisions: ⏎  ⏎ \| Item \| Decision \| ⏎ \|---\|---\| ⏎ \| CR-130 \| Twelve words; longer digests are cut. \| ⏎ \| EPIC-20 \| Yes, compact at build and at ingest. \| ⏎ \| EPIC-20 \| Counts only; the archive stays out of the index. \| ⏎ \| CR-14 \| Keep the old cache until SPRINT-11. \| ⏎ \| EPIC-23 \| GitHub Pages. \| ⏎  ⏎ EPIC-20 has two of the five. The brief shows only the answers, not the questions behind them. Those are in `.cleargate/wiki/decisions.md` if you need them.
- q08: The latest release tag is **v0.0.1**. The session brief shows `Release: .: v0.0.1 + 1 commits`, so `main` is one commit past that tag (the latest commit, `608dc8f "one more commit"`).
- q09: Yes, it's **EPIC-23 — "Static HTML export of the wiki."** ⏎  ⏎ - **Status:** Draft, not in any sprint, gate passing. ⏎ - **Problem & Value:** "Publish the wiki as a static HTML site for readers without the CLI." That matches your idea almost word for word. ⏎ - **Decision already recorded:** the site will be hosted on GitHub Pages. The session brief listed this decision but didn't say what EPIC-23 was about, so I looked it up in the wiki. ⏎ - **Draft file:** `.cleargate/delivery/pending-sync/EPIC-23_Static_HTML_Export.md` ⏎  ⏎ My search for other mentions of a static site or GitHub Pages didn't run because of a command error, so I only checked EPIC-23 itself. Do you want to extend EPIC-23, for example by breaking it into stories or scheduling it into a sprint, or did you have something different in mind?
- q10: The tiered wiki index epic is **EPIC-20**. It has two change requests and one bug: ⏎  ⏎ - **CR-130 "Digest length"**: still a Draft, not in any sprint. The latest decision recorded for it is that digests are capped at twelve words and longer ones are cut. The session brief also lists it as waiting on you. ⏎ - **CR-099 "Fixed-length digest"**: Completed and archived. ⏎ - **BUG-26 "Index drops rolled-up stories"**: the rollup counter resets when two stories share a line. It's a Draft, not in any sprint. ⏎  ⏎ The session brief doesn't say which epic items belong to, so I looked this up in the wiki. CR-099 doesn't show under EPIC-20 in the main list of the wiki index because the index keeps archived items out of that list. It does appear among EPIC-20's children on the epic's own wiki page.
- q11: The session brief doesn't cover this bug. It's in `.cleargate/delivery/pending-sync/BUG-26_Index_Drops_Rolled_Up_Stories.md`. ⏎  ⏎ **BUG-26: Index drops rolled-up stories** (Draft, P2 - Medium, parent EPIC-20) ⏎  ⏎ - **Expected:** every open story appears in the index. ⏎ - **Actual:** the rollup counter resets when two stories share a line. ⏎  ⏎ That's everything the file says. It doesn't give a cause, steps to reproduce, or a fix.
- q12: The digest-length change request, **CR-130**, supersedes **CR-099** and its fixed-length digest rule. The new rule is that digests are limited to twelve words and anything longer is cut. ⏎  ⏎ The session-start brief only showed CR-130's decision. It didn't say what it replaced, so I looked it up in `.cleargate/delivery/pending-sync/CR-130_Digest_Length.md:14`. `.cleargate/wiki/decisions.md` also records it with `Supersedes: [[CR-099]]`. ⏎  ⏎ The wiki still lists an unresolved contradiction between CR-130 and CR-099 about digest length. It's likely the one the brief counts as waiting on you.

# Orientation eval evidence

- Label: release (gating model)
- Started: 2026-11-12T19:30:50.516Z
- Model: claude-opus-5-5
- Ref: main
- Tarball sha256: 5e5c1f464d2aa633ccc3ad16d881e1c2aa4e67406e142273a553c53e18517a63
- orientation-questions.json sha256: 8f158792e845150ff4972e79c35b3e7fbd7c217e0c25461ad5b7abad09b5c55e
- Corpus tree sha256: bdbae52a545ccf8380a52d21dc5587911090fde5887b007d617284139bfe865a
- container: cg-orient-release-0300
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
| q12 | page | yes | CR-099 | 1 | 0 | true | transcripts/orientation-eval.q12.jsonl | claude-opus-5-5 |

## Answers

- q01: **SPRINT-9** is the active sprint: "Ship the session brief so a fresh orchestrator starts oriented." ⏎  ⏎ - **Status:** Active. The latest event is a QA pass on STORY-009-02. ⏎ - **Stories (4):** 2 Done, 1 Architect Passed, 1 Ready to Bounce. ⏎  ⏎ This comes from the session-start brief; I didn't check the repo files. The brief also says the sprint-execution skill should be loaded, but I didn't load it because you only asked a question. I'll load it if you want to run or continue the sprint.
- q02: The session brief says the most recently closed sprint is **SPRINT-08**, closed on 2026-10-05. Its report status was **Shipped**: 5 items were planned, 3 shipped and 2 carried over. ⏎  ⏎ The brief also points to the report's notes, but that line is cut off after "late QA \ backlog — carried 2". The brief also lists SPRINT-08 among the items waiting on you, probably because its close checklist is unfinished.
- q03: Four, per the session brief's "Carried, no sprint" line: ⏎  ⏎ - **BUG-12** ⏎ - **BUG-13** ⏎ - **BUG-15** ⏎ - **STORY-008-05** ⏎  ⏎ None of them is in SPRINT-9 (active), SPRINT-10 or SPRINT-11 (planned). The brief lists only their IDs. I didn't open the items, so I can't give their titles or tell you which two came from SPRINT-08's carry-over.
- q04: Two sprints are planned after the active SPRINT-9: ⏎  ⏎ - **SPRINT-10**: 2 of its 3 items are 🟢 (ready). ⏎ - **SPRINT-11**: its only item is not 🟢 yet. ⏎  ⏎ The session brief doesn't list the sprint goals or which items are in each. That detail is in `.cleargate/wiki/roadmap.md` and `.cleargate/wiki/index.md` if you want it.
- q05: Seven things are waiting on you in total: ⏎  ⏎ **3 failing gates**, all failing the `no-tbds` check, so each still has TBD placeholders to fill in: ⏎ - BUG-22 ⏎ - CR-098-Legacy-Hyphen-Slug ⏎ - STORY-009-04. This one is the "+1 more" the brief cut off. It's in the active SPRINT-9, so it's the most urgent of the three. ⏎  ⏎ **1 open question:** EPIC-22 (draft) has an unresolved `## Open questions` section. ⏎  ⏎ **1 unlabelled contradiction:** this is probably CR-130. I worked that out because it's the only listed item left over, not because I found a record of it, so check before acting on it. ⏎  ⏎ **1 unfinished close checklist:** SPRINT-08's doc-refresh checklist has one item still unticked. ⏎  ⏎ Also worth knowing: there are 3 P0/P1 bugs (BUG-20, BUG-21 and BUG-25). They're all drafts that pass their gates but haven't been approved, and none is assigned to a sprint. ⏎  ⏎ The ClearGate MCP server failed to connect this session, and the CLI reports pre-member state, so pushing isn't possible until you run `cleargate join` with an invite URL.
- q06: Per the session brief, three bugs are open at P0/P1: ⏎  ⏎ - **BUG-20**: Webhook retry drops the second event ⏎ - **BUG-21**: Login times out on slow networks ⏎ - **BUG-25**: Cache serves a stale page ⏎  ⏎ The brief groups P0 and P1 together, so it doesn't say which of these are P0. Tell me if you want that split and I'll check each bug's file.
- q07: The session brief lists these as the latest decisions: ⏎  ⏎ \| Item \| Decision \| ⏎ \|---\|---\| ⏎ \| CR-130 \| Twelve words, longer digests are cut. \| ⏎ \| EPIC-20 \| Yes, compact at build and at ingest. \| ⏎ \| EPIC-20 \| Counts only, the archive stays out of the index. \| ⏎ \| CR-14 \| Keep the old cache until SPRINT-11. \| ⏎ \| EPIC-23 \| GitHub Pages. \| ⏎  ⏎ That's five decisions across four items. EPIC-20 has two of them. ⏎  ⏎ The brief only shows each decision as a short digest, with no dates or the question it answered. For the full entries, see `.cleargate/wiki/decisions.md`.
- q08: The latest release tag is **v0.0.1**. According to the session brief, `main` is 1 commit past that tag. I didn't run any git commands to double-check this.
- q09: Yes, it's **EPIC-23, "Static HTML export of the wiki"**. It's still a Draft and isn't assigned to a sprint. ⏎  ⏎ The session brief hinted at it: its decisions list includes "[[EPIC-23]] GitHub Pages." It didn't name the item, so I checked the wiki index (`.cleargate/wiki/index.md:19`) to confirm the title. ⏎  ⏎ If you want to take the idea forward, extend EPIC-23 rather than drafting a new item.
- q10: The session-start brief didn't name this epic, so I looked it up in the wiki. The tiered wiki index epic is **EPIC-20** (Draft, no sprint). Three items belong to it: ⏎  ⏎ \| Item \| Type \| Status \| Title \| ⏎ \|---\|---\|---\|---\| ⏎ \| CR-130 \| CR \| Draft \| Digest length \| ⏎ \| CR-099 \| CR \| Completed (archived) \| Fixed-length digest \| ⏎ \| BUG-26 \| Bug \| Draft \| Index drops rolled-up stories (the rollup counter resets when two stories share a line) \| ⏎  ⏎ `index.md` lists only CR-130 and BUG-26 under EPIC-20. CR-099 is completed, so it's counted in the Archive section instead. The index's "expand" link points to `wiki/archive/crs.md`, but that file doesn't exist, so the link is broken. ⏎  ⏎ CR-130 is also on your "waiting on you" list. Its decision was: keep digests to twelve words and cut anything longer.
- q11: The session brief doesn't cover this bug, so I looked it up. It's **BUG-26, "Index drops rolled-up stories"** (P2, Draft, under EPIC-20). ⏎  ⏎ What it says goes wrong: when two stories share a line, the rollup counter resets. The expected behaviour is that every open story appears in the index. ⏎  ⏎ That one sentence is everything the bug says about the failure. The file has no steps to reproduce, no root cause and no detail on which line it means. It is at `.cleargate/delivery/pending-sync/BUG-26_Index_Drops_Rolled_Up_Stories.md`.
- q12: CR-130, the digest-length change, supersedes **CR-099** and its fixed-length digest rule. CR-130 sets digests to twelve words and cuts anything longer. ⏎  ⏎ The session brief didn't name the superseded item, so I looked it up in `.cleargate/delivery/pending-sync/CR-130_Digest_Length.md:14`. The wiki page for CR-130 says the same thing.

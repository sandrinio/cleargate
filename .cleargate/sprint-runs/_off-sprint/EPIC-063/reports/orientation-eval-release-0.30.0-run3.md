# Orientation eval evidence

- Label: release (gating model)
- Started: 2026-11-12T20:49:51.094Z
- Model: claude-opus-5-5
- Ref: main
- Tarball sha256: dc79ef15cdc22cf1a4bae3fd9747ce3613f008281e1da902137b87996a521391
- orientation-questions.json sha256: 8f158792e845150ff4972e79c35b3e7fbd7c217e0c25461ad5b7abad09b5c55e
- Corpus tree sha256: bdbae52a545ccf8380a52d21dc5587911090fde5887b007d617284139bfe865a
- container: cg-orient-release-0300-f3
- cli_sha: ac564bc900af72ec33c4b63fca715c6e1cf435c7
- artifact: cleargate-0.30.0.tgz
- cleargate resolved: cleargate
- claude: 2.1.322 (Claude Code)
- prompt framing: Answer from what you were given at session start where it covers the question; use tools only for what it does not cover.
- limits: max-turns 8 · max-budget-usd 2 · timeout 300000 ms per session

VERDICT: PASS

| Q | kind | correct | tokens found | tool calls | skill calls | hook ok | transcript | actual model |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| q01 | brief | yes | SPRINT-9 | 0 | 0 | true | transcripts/orientation-eval.q01.jsonl | claude-opus-5-5 |
| q02 | brief | yes | SPRINT-08, Shipped | 0 | 0 | true | transcripts/orientation-eval.q02.jsonl | claude-opus-5-5 |
| q03 | brief | yes | BUG-12, BUG-13, BUG-15, STORY-008-05 | 0 | 0 | true | transcripts/orientation-eval.q03.jsonl | claude-opus-5-5 |
| q04 | brief | yes | SPRINT-10, SPRINT-11 | 0 | 0 | true | transcripts/orientation-eval.q04.jsonl | claude-opus-5-5 |
| q05 | brief | no | BUG-22, STORY-009-04, EPIC-22, CR-130, SPRINT-08 | 0 | 0 | true | transcripts/orientation-eval.q05.jsonl | claude-opus-5-5 |
| q06 | brief | yes | BUG-20, BUG-21, BUG-25 | 0 | 0 | true | transcripts/orientation-eval.q06.jsonl | claude-opus-5-5 |
| q07 | brief | yes | CR-130, EPIC-20, CR-14, EPIC-23 | 0 | 0 | true | transcripts/orientation-eval.q07.jsonl | claude-opus-5-5 |
| q08 | brief | yes | v0.0.1 | 0 | 0 | true | transcripts/orientation-eval.q08.jsonl | claude-opus-5-5 |
| q09 | page | yes | EPIC-23 | 1 | 0 | true | transcripts/orientation-eval.q09.jsonl | claude-opus-5-5 |
| q10 | page | yes | CR-130, BUG-26, CR-099 | 3 | 0 | true | transcripts/orientation-eval.q10.jsonl | claude-opus-5-5 |
| q11 | page | yes | rollup counter | 2 | 0 | true | transcripts/orientation-eval.q11.jsonl | claude-opus-5-5 |
| q12 | page | yes | CR-099 | 1 | 0 | true | transcripts/orientation-eval.q12.jsonl | claude-opus-5-5 |

## Answers

- q01: The active sprint is **SPRINT-9**: "Ship the session brief so a fresh orchestrator starts oriented." ⏎  ⏎ - **Status:** Active. STORY-009-02 has passed QA. ⏎ - **Stories (4):** 2 Done, 1 Architect Passed, 1 Ready to Bounce. ⏎  ⏎ This comes from the brief printed when the session started. I didn't run any tools to check it again.
- q02: **SPRINT-08** was the most recently closed sprint, on 2026-10-05. Its report status was **Shipped**: 5 stories planned, 3 shipped and 2 carried over. ⏎  ⏎ The session-start brief cuts off the report's Notes line partway through ("late QA \ backlog — carried 2…"), so I can't give you the full note from there. The brief also lists SPRINT-08's close checklist as still unfinished.
- q03: According to the session brief, 4 open items were carried over and aren't assigned to any active or planned sprint: ⏎  ⏎ - BUG-12 ⏎ - BUG-13 ⏎ - BUG-15 ⏎ - STORY-008-05 ⏎  ⏎ That count of 4 includes more than SPRINT-08's carryover. SPRINT-08 itself carried over only 2 items, so the rest came from earlier sprints.
- q04: Two sprints are planned after the active SPRINT-9, according to the session brief: ⏎  ⏎ - **SPRINT-10**: 3 items, 2 of them ready (🟢). ⏎ - **SPRINT-11**: 1 item, not ready yet (0 of 1 🟢). ⏎  ⏎ Separately, 4 carried items have no sprint: BUG-12, BUG-13, BUG-15 and STORY-008-05. ⏎  ⏎ The brief doesn't list the item IDs in SPRINT-10 and SPRINT-11 or which ones are blocking. I can open the sprint files if you want that.
- q05: Four kinds of things are waiting on you, according to the session brief: ⏎  ⏎ 1. **3 failing readiness gates.** BUG-22, CR-098 (Legacy-Hyphen-Slug) and STORY-009-04 all fail `no-tbds`, so each still has TBD text that needs filling in. ⏎ 2. **1 open question** on EPIC-22. ⏎ 3. **1 unlabelled contradiction** on CR-130. ⏎ 4. **1 unfinished close checklist** for SPRINT-08, which closed on 2026-10-05. ⏎  ⏎ **Also worth knowing:** ⏎ - **Active sprint, SPRINT-9:** of its 4 stories, 2 are Done, 1 has passed Architect review and 1 is Ready to Bounce. STORY-009-02 is at QA pass. ⏎ - **3 open P0/P1 bugs:** BUG-20 (webhook retry drops the second event), BUG-21 (login times out on slow networks) and BUG-25 (cache serves a stale page). ⏎ - **4 carried items with no sprint:** BUG-12, BUG-13, BUG-15 and STORY-008-05. ⏎ - **Planned sprints:** SPRINT-10 has 2 of 3 items ready (🟢); SPRINT-11 has 0 of 1. ⏎ - **No syncing yet:** you're in pre-member state and the cleargate MCP server failed to connect, so nothing can be pushed or pulled. Running `cleargate join <invite-url>` fixes the membership part. ⏎  ⏎ The TBD fixes in item 1 are the quickest to clear. Want me to start there? [missing: CR-098-Legacy-Hyphen-Slug]
- q06: Three bugs are open at P0/P1, according to the session brief: ⏎  ⏎ - **BUG-20**: Webhook retry drops the second event ⏎ - **BUG-21**: Login times out on slow networks ⏎ - **BUG-25**: Cache serves a stale page ⏎  ⏎ The brief groups P0 and P1 together, so it doesn't say which of these are P0. I can check the bug files if you need that split.
- q07: The session brief lists these as the latest decisions: ⏎  ⏎ - **CR-130**: "Twelve words, longer digests are cut." ⏎ - **EPIC-20**: "Yes, compact at build and at ingest." ⏎ - **EPIC-20**: "Counts only, the archive stays out of the index." ⏎ - **CR-14**: "Keep the old cache until SPRINT-11." ⏎ - **EPIC-23**: "GitHub Pages." ⏎  ⏎ These are only the short summaries the brief shows, so they don't include the question each decision answered. The full entries are in `.cleargate/wiki/decisions.md`. CR-130 also has an unlabelled contradiction waiting on you.
- q08: The latest release tag is **v0.0.1**. `main` is 1 commit ahead of it. This comes from the release line in the session brief, which I didn't re-check with git.
- q09: Yes. **EPIC-23, "Static HTML export of the wiki,"** already covers this idea. ⏎  ⏎ - **Status:** it's a Draft and isn't assigned to any sprint, so it's not in SPRINT-9, 10 or 11. ⏎ - **Hosting:** the session brief records a decision under EPIC-23: "GitHub Pages." ⏎  ⏎ I found it in the session brief's decision list and the wiki index (`.cleargate/wiki/index.md:19`). I haven't read the raw epic file. ⏎  ⏎ If your idea goes beyond what EPIC-23 describes, it's better to extend that epic than to draft a new item.
- q10: The tiered wiki index epic is **EPIC-20**, a Draft with no sprint assigned. The session brief doesn't say which items belong to which epic, so I took this from the wiki. ⏎  ⏎ **Change requests:** ⏎ - **CR-130**: Digest length. Draft, no sprint. The brief lists it as having an unlabelled contradiction, and it carries the decision "twelve words, longer digests are cut." ⏎ - **CR-099**: Fixed-length digest. Completed. It doesn't appear under the epic in `index.md` because finished items are moved to the Archive section, but EPIC-20's page still lists it as a child. ⏎  ⏎ **Bugs:** ⏎ - **BUG-26**: Index drops rolled-up stories (the rollup counter resets when two stories share a line). Draft, no sprint.
- q11: The session brief doesn't mention this bug, so I looked it up. It's **BUG-26: "Index drops rolled-up stories"** (P2, Draft, parent EPIC-20). ⏎  ⏎ - **Expected:** every open story appears in the index. ⏎ - **What goes wrong:** the rollup counter resets when two stories share a line. ⏎  ⏎ That's all the bug file says. It has no reproduction steps or root-cause section. ⏎  ⏎ Source: `.cleargate/delivery/pending-sync/BUG-26_Index_Drops_Rolled_Up_Stories.md`
- q12: The digest-length change request, **CR-130**, replaces **CR-099** and its fixed-length digest rule. Under CR-130 a digest is twelve words, and longer ones are cut. ⏎  ⏎ The session-start brief didn't name the replaced item, so I looked it up. CR-130's wiki page says so directly, and `decisions.md` lists it as `Supersedes: [[CR-099]]`. ⏎  ⏎ CR-130 is still a Draft, and the brief shows it has a contradiction that hasn't been labelled yet.

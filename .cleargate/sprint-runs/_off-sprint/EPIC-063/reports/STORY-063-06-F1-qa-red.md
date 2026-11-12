# STORY-063-06-F1 QA-Red (role: qa, Mode: RED)

Branch `story/STORY-063-06-F1` (cleargate-cli), cut from main 3a84743. No production code, template or commit touched. The orchestrator commits.

## Files
| File | Change | Tests |
|---|---|---|
| `test/commands/new-command.node.test.ts` | appended `describe('06-F1 ...')` | +6 |
| `test/lib/wiki/new-draft-alarm-window.red.node.test.ts` | new | +2 |

## Red counts (measured, `tsx --test` on both files: 63 tests, 56 pass, 7 fail)
Baseline `new-command.node.test.ts` alone was 55/55 green before the addition.

**Item 1: `cleargate new` stamps the injected now (6 red).** One test per type: epic, cr, bug, story (`--epic EPIC-054`), sprint, initiative. Each calls `newHandler` with `now: "2031-03-05T09:00:00.000Z"`, asserts exit 0, then asserts `created_at` and `updated_at` equal the injected now and contain no `{ISO}`, `{ISO-8601 timestamp}` or `2026-04-17`.
- Reason for each red: `created_at` is `"2026-04-17T00:00:00Z"` (epic, cr, bug, story, sprint) or the literal `{ISO-8601 timestamp}` (initiative). That is the template literal surviving, the right reason.
- The first draft of the tests asserted exit code `null`. `newHandler` signals success with `exit(0)`, so it failed for the wrong reason. Corrected to 0 before counting.

**Item 2: end-to-end alarm window (1 red, 1 green guard).** Temp project with the canonical epic.md and a `config.yml` whose `wiki.ingest_buckets` omits stories. `new epic x` at T, then `checkUncheckedDrafts`:
- T+2d must name EPIC-001. RED: `ids=[]`, because the draft carries 2026-04-17.
- T+10d must not name it. GREEN today and after the fix. It is a negative guard: a 7-month-old literal is outside the window today for the wrong reason, and a real T is outside it for the right one. Keep it so the window upper bound stays pinned once the fix lands.
- Draft is `approved: false`, status Draft by template, so `phase4SkipReason` does not skip it.

**Item 4: docs red. Skipped.** No doc in `scaffold/core/.cleargate/knowledge` or `scaffold/hosts/claude/CLAUDE.md` describes the alarm or its window. "contradiction check missing" exists only in `src/lib/wiki/unchecked-drafts.ts` and its tests. No doc claims Edit/Write stamps `updated_at`:
- protocol §10.9 (`cleargate-protocol.md:366`) says the PostToolUse hook does "stamp, gate, ingest". That is `stamp-tokens`, not `updated_at`, so it is ambiguous but not a false `updated_at` claim.
- §11.1 and §11.2 (`:404`) correctly say `updated_at` moves on `cleargate stamp`.

Flag for the Developer, not tested: §11.1's `created_at` row says "set once on first `cleargate stamp`". After decision 16, `cleargate new` sets `created_at` and `updated_at`. Fold that into the doc if the orchestrator wants it truthful; protocol §11 is the natural place for a "`updated_at` moves on `cleargate new`, `cleargate stamp`, `sprint add|remove`, not on Edit/Write" sentence. I did not red it because the dispatch made that item conditional on a false claim existing.

## Pin census (item 3)
`command grep -rln "2026-04-17" test/` hits 4 files. None pins a template's timestamp.
| File | What it is | Decision |
|---|---|---|
| `test/integration/comments-cache-to-wiki.node.test.ts:79` | fixture comment `created_at: '2026-04-17T11:00:00Z'` | fixture's own date, leave |
| `test/lib/ledger-reader.node.test.ts:246` | ledger row `ts` | fixture's own date, leave |
| `test/hooks/pre-tool-use-autonomy.red.node.test.ts:184` | text "ISO-8601 timestamp" in a message | not a template pin, leave |
| `test/scripts/init-sprint-context.red.node.test.ts:19,216,227` | text "ISO-8601 timestamp"; sprint_context.md template, not in decision 16 | leave |

Also checked, no change needed:
- `test/integration/foreign-repo.integration.node.test.ts:421-422`: fixture's own `2026-04-24`.
- `test/docs/gate-section-index-pinning*.ts`, `test/scripts/template-stubs.integration.node.test.ts`, `test/scaffold/enforcement-doc-coherence.node.test.ts`, `test/e2e/frontmatter-authoring.red.integration.node.test.ts`, `test/e2e/sprint-*.red.integration.node.test.ts`, `test/e2e/spidr-coverage...`: none reads `created_at`/`updated_at` or a date; they check sections, stubs or stamping flow. Unaffected.
- `test/fixtures/**`: no fixture reads a template's literal date. `fixtures/*/pre-edit-gate.sh` and `token-ledger.sh` matches on `{ISO` are unrelated hook text.
- Template byte hashes: `test/helpers/init-fixture.ts` `SANCTIONED_BASELINE_DELTAS` rows for `templates/epic.md` (:634), `story.md` (:641) and `Sprint Plan Template.md` (:762) hold currentHash literals. They run only inside `captureOrCompare` when an external `baselineDir` is supplied (:1031 returns early otherwise), and no in-repo test supplies one. The epic and story currentHash values (`d99b995b...`, `e7736854...`) already differ from today's canonical sha256 (`2bc69b20...`, `fe61b0c7...`), so they are dormant and stale before this change. Decision: left unchanged. They pin a past delta (BUG-090), not the timestamp, and amending would assert nothing runnable. The Sprint Plan row is computed, not literal. The hotfix row (`38edde0d...`) matches canonical and hotfix.md is untouched by decision 16.
- `test/scripts/scaffold-relocation.red.integration.node.test.ts` compares the composed payload with a frozen baseline tree only under env `CLEARGATE_RELOCATION_BASELINE` (skipped otherwise). It would diff on these six templates if someone ran it, which is expected.

Result: no pin required a `{ISO}` update; zero deliberate pin edits.

## Expected-red live tests after the Dev edit, before the §R re-sync
These compare the outer repo's live `.cleargate/templates/*` with canonical. I did not change them.
1. `test/scaffold/canonical-live-parity.red.integration.node.test.ts`, Scenario 5a (templates dir byte parity). Already red today: live `epic.md` and `story.md` differ from canonical (`diff -rq`). After the edit, CR, Bug, initiative and Sprint Plan join them.
2. `test/docs/gate-section-index-pinning.live.integration.node.test.ts`, S1c (live and canonical templates byte-identical).
3. `test/scripts/template-claude-md.live.integration.node.test.ts` (live vs canonical templates, byte-level at :68).
4. `test/docs/contract-first-dag-text.live.integration.node.test.ts` (reads live and canonical `Sprint Plan Template.md`; goes red only if it compares bytes, which :48 suggests).

Not verified red-vs-green for 2 to 4, since canonical has not changed yet. The first three read live templates directly.

## Notes for the Developer
- Change `created_at` and `updated_at` to `"{ISO}"` in epic.md, CR.md, Bug.md, story.md, `Sprint Plan Template.md`, initiative.md. Do not touch `*_version`.
- N3 in new-command.node.test.ts lists `{ISO}` as FORBIDDEN in output. The new templates are consistent with it, and it is green today because `{ISO}` is substituted.
- `new` writes the real clock when `now` is not injected, so no production change is needed in `src/commands/new.ts`.

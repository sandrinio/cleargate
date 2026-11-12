# CR-126 QA-Verify (role: qa)

QA: FAIL (one outer-file defect; code, tests, template, gates doc all verified)

- typecheck: pass. 5 named test files: 268 pass / 0 fail. check:no-inline-id-regex: pass.
- `git diff e8f2f39 7a63904 -- test/`: empty. dist/ not rebuilt (mtime Nov 10, no diff).
- Unedited shipped epic.md fails; detail: `labelled line "What "working" means" is empty or still a {...} placeholder`.
- Registered in the existing epic ready-for-decomposition fence; vocab entry 13 present; counts 13 / 14.
- Exemption: same-parent story passes ("decomposed before CR-126"); STORY-9001-01 / 064-01 / 90-01 do not exempt. Live check: EPIC-059 exempt (4 stories), EPIC-052 and EPIC-019 fail (EPIC-019 harmless).
- authorTestingStrategy is a no-op when the section is absent; fills placeholders.
- EPIC-063 passes with the exemption bypassed (7 lines, 5 levels, 5 journeys). Ticked checkbox present.

## Defect
EPIC-063 line 375 has a stray `## Testing Strategy.` heading (trailing period) directly above the real `## Testing Strategy`, after the pointer line at 373. Template shape has no such heading. Predicate ignores it only because the title differs. Fix: delete line 375 (and its blank line).

Expected-red: gate-section-index-pinning.live.integration S1c (until release re-sync).

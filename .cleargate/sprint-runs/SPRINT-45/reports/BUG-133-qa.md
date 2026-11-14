# BUG-133 QA-Verify (SPRINT-45)

role: qa

- Red files untouched: `git diff 7b88945 b310e09 -- '*red*'` is empty (0 lines).
- Typecheck: `npm run typecheck` clean.
- Targeted tests (upgrade-output.red, upgrade-output.red.integration, upgrade-changelog, upgrade-state-parity.red, install-state-parity.red, upgrade-field-path.red.integration, changelog-slice): 84 pass, 0 fail, 0 skipped.
- Scenarios: Sc1 (summary line, 1 overwritten line) -> red.node "Sc1"; Sc2 (dry-run label, no "-> clean") -> "Sc2" tests (always, pin-aware, merge-3way both labels); Sc3 (replaced-edits line) -> "Sc3"; Sc4 (plan before notes, only Upgrade notes, CHANGELOG line) -> integration "first line is a plan line". Edges: mode-only, --only, example config tally, C-3 unchanged line, no zero line, hasLocalEdits and extractUpgradeNotes seams. 4/4.
- Diff review cd54e93..be392bd -- src/: only upgrade.ts and changelog.ts (both in section 4). sliceChangelog untouched, extractUpgradeNotes additive. Write behaviour unchanged (same writeAtomic + chmod; only the printing and tally differ). Dry-run uses the same fileOutcome check as the real run. Surgery targets come from adapter.surgeryTargets() (CLAUDE.md, .claude/settings.json, .mcp.json) and bypass the unchanged filter. Label text and unchanged-count line match C-3 (zero count suppressed). Notes printed after plan (dry) / after "[upgrade] complete." (real).
- Manual CLI run, scratch fixture bug133-qa (init --yes, appended a line to .cleargate/scripts/prep_qa_context.mjs):

```
[dry-run] .claude/settings.json  action=merge-3way  state=clean
[dry-run] .cleargate/scripts/prep_qa_context.mjs  action=overwrite  state=user-modified → overwritten, local edits lost
[dry-run] 76 unchanged (not listed)
[dry-run] 2 files planned. No changes made.
```
  --yes: `[always] overwritten (local edits replaced): .cleargate/scripts/prep_qa_context.mjs` then `[always] 55 unchanged, 1 updated (1 had local edits)`.
  Note: no version change in the fixture, so no release notes printed (matches edge condition). In this fixture .mcp.json/CLAUDE.md produce no dry-run line (not manifest work items; not in the diff's scope).
- DoD: gherkin covered, reds green, no out-of-scope files, no new deps.

Findings: none blocking.

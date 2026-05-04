# CR-052 DevOps Report — wrapScript Shared Test Helper

**Story:** CR-052
**Merge SHA:** see git log on sprint/S-24
**Story branch:** story/CR-052 (deleted; was c9dbe72)
**State transition:** Done
**Operator:** orchestrator-fallback (devops subagent_type still not registered — same as CR-049)

## Required reports

| Report | Status |
|---|---|
| CR-052-dev (acceptance signal) | ✓ |
| CR-052-qa.md | ✓ (PASS, 7/7) |
| CR-052-arch.md | ✓ (APPROVED) |

## Actions

1. `git merge story/CR-052 --no-ff` — auto-merge clean (no conflicts).
2. No prebuild needed (CR-052 = test/ files only; no canonical scaffold touched).
3. Mirror parity audit: 4 known scripts still byte-identical (no regression from CR-049).
4. Test verification: `tsx --test test/helpers/wrap-script.red.node.test.ts` — 8/8 pass (4 scenarios × 2 it-blocks).
5. Worktree removed; story branch deleted; state → Done.

## TPV signal — second operational dispatch

CR-052 TPV returned APPROVED clean (no BLOCKED-WIRING-GAP). Architect post-flight: "TPV value signal real but soft for this CR. Larger payoff expected on CR-050." Same baseline as CR-049 — running tally: 0/2 blocking-wiring-gap returns. Will track through CR-051 + CR-050 for the §5 metric.

## Notes

- Backcompat test (`run-script-wrapper-backcompat.node.test.ts`) refactored as proof-of-consumer; ~145 LOC of inline plumbing eliminated; 7 tests unchanged.
- macOS `realpathSync` mitigation captured in flashcard for future tmpdir+wrapper authors.
- Helper at `cleargate-cli/test/helpers/wrap-script.ts` (~181 LOC) ready for CR-050 to consume in W2-3.

## Flashcards flagged

- `2026-05-04 · #wrapper #helper #macos-realpath · fs.realpathSync(tmpdir) needed before wrapper-path construction; macOS /var/folders symlink causes SCRIPT_DIR mismatch in run_script.sh cd+pwd resolution.`

# STORY-063-08-F1 Developer report (role: developer)

STATUS: done. Branch story/STORY-063-08-F1 in cleargate-cli.
TYPECHECK: pass. wiki tests: 752 run, 751 pass, 0 fail (1 skipped). Full npm test: 4419 tests, 4417 pass, 0 fail, 2 skipped.
Live sweep: green. resolved 308 / open 250; placeholderResolved 0; swallowed 0; badOpen 0; badDecision 0; bad digests 0; inverted 0.
(The 402 in the Arch report was measured over a wider set; the live test sweeps interrogation-loop and open-questions sections via findSection, and uses a floor of 250.)
Timing: all 622 raw items, extractParts + allocateBudget + digest: ~205 ms with the change vs ~195 ms without (same script, same machine). About +5%; the 08 baseline of 99 ms covered 344 pages without digests.
Delivery tree: `git status --porcelain .cleargate/delivery` empty before and after.
`node scripts/build-codex-payload.mjs --check` exits 0 after gen:codex + copy-planning-payload + build-manifest.

## Changes
- src/wiki/extract-sections.ts: F1-1 answer forms (indented, inline with code-span guard, Recommended closes text), full placeholder rule; F1-2 strict digestSource (Actual / bare Actual, New Logic), digestOf per G-M2-47; F1-3 outermost tag back-off, fence closes with opener's delimiter, whitespace word boundary, fill pass only when max >= PAGE_EXTRACT_MIN.
- Docs (canonical scaffold only): protocol 10.4 example and size claim, query agent, ingest agent; Codex TOMLs regenerated.
- extract-sections.red.node.test.ts: only the BUG-900 / CR-900 digestSource rows.

## Deviations
- digestOf's leading-label drop also accepts `**...?**` (the PROPOSAL template's `**Why are we doing this?**`); the live sweep requires it.
- digestOf strips leading ordered-list markers (`1.`); without it BUG-105's digest was "1".
- Paragraph extent for bug/cr digestSource: from the label line to the end of the part (decision 10 left it open).

## flashcards_flagged
- 2026-11-12 · #wiki #digest · digestOf must strip "1." list markers too, else a numbered Actual list digests to "1".
- 2026-11-12 · #wiki #digest · Proposal template label is `**Why are we doing this?**` (ends in ?, no colon); the label drop must accept ? or :.

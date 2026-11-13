role: developer — BUG-095, REL-0.30.1 U2, branch story/REL-0301-upgrade

STATUS: done, with ONE red-test defect to route back to QA-Red (below)
COMMIT: 57c06df  fix(upgrade): BUG-095 upgrade refreshes the .mcp.json pin, CLAUDE.md block and config example
TYPECHECK: pass; check:no-shell-true-in-init clean

Files: README.md, src/commands/upgrade.ts, src/commands/verify-install.ts, src/hosts/claude.ts,
src/hosts/types.ts, src/init/inject-mcp-json.ts, src/lib/manifest-builder.ts (doc comment only)

## Red-test defect (not edited)
upgrade-mcp-refresh.red.node.test.ts "Sc2 ... only the cleargate pin changes (init format)":
first assertion (full-file equality with JSON.stringify(expected,null,2)+"\n") PASSES; the second
`finalText.includes(JSON.stringify({mine:userServer},null,2).slice(2,-2))` is unsatisfiable: the snippet is
indented for a top-level object (`\n    "command"`), the file nests `mine` under mcpServers (`\n      "command"`).
Any init-format file fails it, including the one the first assertion demands. Fix: indent the needle by 2
(or drop it; line 222). 20/21 of that file green; this is the only failure.

## Tests
- upgrade-mcp-refresh.red: 20 pass / 1 fail (the defect above). readme-upgrading.red: 6/6.
- Default-tier upgrade*, init*, verify-install*, lifecycle-*, hosts/* (incl. host-adapter-contract) + BUG-122/120/121 reds: 361 tests, 360 pass, 1 fail (same Sc2).
  Failures only for lack of dist: init-no-dep0190, init-restart-banner (identical on stash).
- Importers/README/docs/init/lib/doctor/uninstall set (544): 3 fail after vs 7 before; the 4 delta are the
  README reds now green. Remaining (qa.md mirror parity, doctor drift, doctor execution_mode) fail identically on stash.
- Built (scratch /tmp/cgb.* of 57c06df): upgrade-field-path.red.integration -> 6/6 (BUG-122, 120, 121, 095 x2).
- Smoke on a copy of da-pre030 (0.27.0 -> 0.30.0), CLEARGATE_NO_UPDATE_CHECK=1:
  [dry-run] .mcp.json  action=repin  cleargate@0.27.0 → cleargate@0.30.0
  [dry-run] CLAUDE.md  action=block-refresh  (moves the block to the top; 67 lines of your content follow it)
  [dry-run] .cleargate/config.example.yml  action=overwrite
  upgrade --yes </dev/null exit 0:
  [mcp] repinned .mcp.json: cleargate@0.27.0 → cleargate@0.30.0
  [block] refreshed the ClearGate block in CLAUDE.md; moves the block to the top; 67 lines of your content follow it
  [always] overwritten: .cleargate/config.example.yml
  ⚠ Restart Claude Code in this repo to load the new configs:  .mcp.json (loaded once at session start)
  .mcp.json pin: cleargate@0.30.0; verify-install exit 0 (Result: PASS)

## Plan deviations
None. Notes: UntrackedPlan/UntrackedRefreshCtx exported from hosts/types.ts; packageRoot + newPinVersion both hoisted
above the dry-run block (planUntracked/planExampleConfig closures live there); the example write uses writeAtomic +
copyPackageMode; verify-install clips found/expected at 60 chars with `...`; the [skip] CLAUDE.md warning is emitted
at plan time (once). No flashcards.

role: qa  (Mode: RED) — BUG-095, REL-0.30.1 U2, worktree cg-wt/u2, HEAD 350b27e. Not committed.

QA-RED: WRITTEN
BASELINE_FAIL: 16 of 21 cases in upgrade-mcp-refresh; 4 of 6 in readme-upgrading; 1 of 2 in the integration BUG-095 describe (21 red, 8 green controls)

Files (worktree-relative)
- test/commands/upgrade-mcp-refresh.red.node.test.ts  (new)
- test/docs/readme-upgrading.red.node.test.ts  (new)
- test/commands/upgrade-field-path.red.integration.node.test.ts  (added describe('BUG-095'))
- No existing test changed shape: grep of .mcp.json / CLAUDE.md in lifecycle-*, upgrade*, dogfood-install found none that init (FIXED_PIN), upgrade, then assert those bytes unchanged. Manifest-entry fixtures (upgrade-claude-md, upgrade-restart-warning) are covered by the `handled` skip.

Red on HEAD (reason)
- Sc1 pin follows: .mcp.json stays cleargate@0.0.1, no [mcp] line.
- Sc2 other server: file not re-pinned (expected init-format bytes differ).
- Sc3 block (2 cases): block stays old; no [block] line / detail.
- Sc4 example (2 cases): stays `# old` / absent; no [always] line.
- Edges: no-cleargate-entry warning, malformed warning, single [skip] CLAUDE.md line missing; --only cli-config does not refresh.
- Dry run (2 cases): no repin / block-refresh / overwrite plan lines.
- Restart warning: no Restart line, .mcp.json unchanged.
- G-R-19 (2 cases): details lack "(found …, expected …)" and "(first difference at block line k: …)".
- Tree parity: fresh init vs aged+upgraded differ in EXACTLY three files: .cleargate/config.example.yml, .mcp.json, CLAUDE.md (bytes). Nothing else (modes, hooks, templates, snapshot all already match after 122/120/121), so the test is sound and goes green only when the three refreshes land.
- README (4 cases): no wiki build, no three-command block (has 2, wrong), no .mcp.json mention, no no-terminal refusal sentence.
- Integration: after init --pin 0.0.1 + upgrade --yes, .mcp.json still cleargate@0.0.1 (built base 0.30.0).

Green controls on HEAD (must stay green)
- 2nd upgrade no-op for .mcp.json; block already equal -> unchanged/no line; example already equal -> no line; absent CLAUDE.md/.mcp.json never created; dry run plans none when current; README keeps no `cleargate init` and keeps the existing paragraphs; integration control (fresh init passes verify-install); BUG-122/120/121 describes.

Spec pins I chose (Dev must match; flag if wrong)
- Package version = payload MANIFEST.json cleargate_version (what upgradeHandler uses as newPinVersion).
- verify-install block line number is 1-based with the START marker as line 1; found/expected are the full lines when <= 60 chars.
- config.example.yml is written when the target is absent (per G-R-18).
- --only <non-cli-config tier> skips all three; --only cli-config runs them.
- Dry-run count: `N files planned` identical before and after aging the three surfaces.
- README: fenced block lines start with the three commands; `--yes` line contains "no terminal"; the old "asks nothing it cannot ask" sentence is not asserted either way.

Verification run
- Integration vs scratch build of HEAD: /tmp/cgb.zVmc (git archive HEAD, build ok), CLEARGATE_BUILT_CLI=/tmp/cgb.zVmc/dist/cli.js; BUG-095 test red on the pin assertion, other three describes green.
- `npm run typecheck` clean.

flashcards_flagged: []

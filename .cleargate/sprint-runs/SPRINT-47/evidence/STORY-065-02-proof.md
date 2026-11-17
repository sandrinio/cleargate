# STORY-065-02 proof (rule 7, hand-applied)

- Proof column: Unit + integration + clean-room — recorder reds on a temp repo; init/upgrade reds; `cleargate init` from the packed tarball shows the `proof` block.
- Clean-room (Developer, 2026-11-16): `npm pack` of the worktree installed under a temp prefix; `cleargate init --yes` in a temp git repo with `go.mod` and a `Makefile` `e2e:` target → `gate-checks.json` `proof` = `{"unit":"go test ./...","container":"make e2e","browser":""}`, `qa.test` `go test ./...`; `record_evidence.mjs` and `lib/proof.mjs` installed; `cleargate doctor` printed no gate-checks/drift line (BUG-091 unaffected).
- QA-Verify PASS (5/5 scenarios, by hand in a temp repo: container pass with sha and 40-line tail, TOKEN masking, human pending → `--human`, the live/human `--worktree` clarification, command-source order, baseline excuse, timeout with a grandchild, atomic write).
- Post-flight FAIL (prototype-unsafe gate-key merge; proof process group) → amendment reds f1be6a6 → fix 84d7f77 (+ URL-credential masking) → re-verify PASS (background child, slow timeout, SIGTERM interrupt, URL masking, `__proto__`) → post-flight PASS.
- Contract C1 amendment: `readProofTier` skips a leading `<instructions>` block → amendment red 213ad3c → fix b159b5c; verified by the orchestrator (5 files, 22 tests, 0 fail; typecheck 0).
- Commits: C1 37efc13, qa-red b644eff, dev 0669ac3, integrations 7ab6022/ab1810e, amendments f1be6a6/213ad3c, fixes 84d7f77/b159b5c; cli main merge below.
- cli main merge: 3dfd3eb merge(story/STORY-065-02): STORY-065-02 record evidence for a proof

---
story_id: "STORY-007-00"
parent_epic_ref: "EPIC-007"
status: "Ready"
ambiguity: "🟡 Medium"
complexity_label: "L1"
context_source: "PROPOSAL-004_Public_Discoverability.md"
created_at: "2026-04-19T15:00:00Z"
updated_at: "2026-04-19T15:00:00Z"
created_at_version: "post-SPRINT-04"
updated_at_version: "post-SPRINT-04"
---

# STORY-007-00: Git Remote + Initial Push to GitHub

**Complexity:** L1 — three commands, irreversible-ish (publishing).

## 1. The Spec

Configure the meta-repo's git remote to point at `sandrinio/ClearGate` (current PascalCase URL — STORY-007-01 will rename to lowercase post-push), then push the entire local main history. After this story, anyone can `git clone` the repo and the remote becomes the durable backup of the framework.

### Out of Scope
- GitHub repo creation if it doesn't exist yet — that's a manual UI action by the user (no `gh` CLI assumption in this story).
- Repo rename to lowercase (that's STORY-007-01).
- Description/topics/README content (that's STORY-007-01/02/03).
- Pushing any branch other than `main`.

## 2. Acceptance

```gherkin
Scenario: Remote configured and points at GitHub
  When I run `git remote -v`
  Then origin shows fetch + push URLs at github.com:sandrinio/ClearGate (or the resolved redirect post-rename)

Scenario: Initial push succeeds
  Given the GitHub repo exists at sandrinio/ClearGate (created via web UI by user pre-story)
  When I run `git push -u origin main`
  Then the remote main branch reflects all 14+ local commits since 7100cfa
  And `git rev-parse origin/main` matches local HEAD
  And `git status` shows "Your branch is up to date with 'origin/main'"

Scenario: Tracking is set up
  Given the push completed
  When I check `.git/config`
  Then a [branch "main"] section exists with remote = origin and merge = refs/heads/main
```

## 3. Implementation

```bash
# 1. Add origin (URL chosen at execute-time per §6 Q1)
git remote add origin <URL>

# 2. Verify
git remote -v
# Expect: origin  <URL> (fetch)
#         origin  <URL> (push)

# 3. Sanity-check what we're about to publish
git log --oneline | head -20    # confirm history
du -sh .                        # size sanity (should be << 100 MB to fit GitHub upload smoothly)
git status                      # clean working tree

# 4. Push
git push -u origin main

# 5. Verify
git rev-parse HEAD
git rev-parse origin/main       # should equal HEAD
git status                      # should say "up to date with 'origin/main'"
```

## 4. Quality Gates

- Manual: open https://github.com/sandrinio/ClearGate (or whichever URL after rename) in a browser; confirm files are visible.
- Manual: `git clone https://github.com/sandrinio/ClearGate /tmp/cleargate-clone-test && ls /tmp/cleargate-clone-test/.cleargate/wiki/index.md` — verifies the public clone works end-to-end.
- No unit tests (this is git config + ops, not code).

## 5. Reuse / Existing Helpers

None. Pure git CLI.

## 6. AI Interrogation Loop — 🟡 Medium

**Q1: Repo URL — SSH or HTTPS?**
- SSH: `git@github.com:sandrinio/ClearGate.git` — assumes you have SSH keys configured for github.com (most common dev setup).
- HTTPS: `https://github.com/sandrinio/ClearGate.git` — assumes you have a credential helper (osxkeychain on macOS) or will paste a personal access token.
- **Recommendation:** SSH. You're on macOS and almost certainly have SSH keys for GitHub already.

**Q2: Does the GitHub repo `sandrinio/ClearGate` exist yet?**
- If no, create it at https://github.com/new — empty, no README, no .gitignore, no license (we're pushing those from local).
- If yes, confirm it's empty (or you accept that any existing remote content gets... actually, if remote has commits and we `git push -u origin main` from a divergent local, it errors out. Safest: empty remote at push time.)
- **Action needed:** confirm before story dispatches.

**Q3: Visibility — public or private?**
- Public exposes: all sprint history, REPORT.md content (cost data + agent count + flashcards), 80+ work items, four-agent role definitions, the wiki itself.
- Private hides all of that, but undermines PROPOSAL-004's whole point (discoverability).
- **Recommendation:** public, since PROPOSAL-004's success metric is "GitHub search surfaces the repo." If you want to publish privately first to inspect, that's a 1-click toggle later.

**Q4: Anything in the repo we should NOT publish?**
Checked:
- `knowledge/` — gitignored ✓ (your private design notes won't push)
- `.claude/settings.local.json` — gitignored ✓ (your permission allowlist stays private)
- `.claude/` (whole dir) — gitignored ✓ (live runtime, not shipped)
- `.cleargate/sprint-runs/.active` — gitignored ✓
- No `.env` files committed (verified earlier today)
- No API keys / tokens in any markdown file (would need a fresh `git grep -i "key\|token\|secret"` audit before push for full safety)
- **Action needed:** want me to run a pre-push secret scan?

**Q5: Default branch name?**
- We're already on `main`. GitHub's default for new repos is `main`. No action needed.

**Q6: Squash old SPRINT-03 / Phase 2c noise?**
- The history has ~80+ commits going back to SPRINT-01. Some are noisy (Phase 2c rename batch, hook fix follow-ups).
- **Recommendation:** push history as-is. Noise is real but rewriting public-bound history is more risky than valuable. Future cleanup via `git rebase -i` is always available locally for unpushed work.

## Ambiguity Gate

**Status: 🟡 Medium → 🟢 Low** when human answers Q1 (URL form), Q2 (repo exists?), Q3 (public/private), and Q4 (run secret scan?). Q5 is informational; Q6 has a recommendation that defaults to "no rewrite."

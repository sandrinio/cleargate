---
story_id: "STORY-000-04"
parent_epic_ref: "EPIC-000"
status: "Completed"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
sprint_id: "SPRINT-03"
shipped_commit: "f97b3f1"
completed_at: "2026-04-18T04:00:00Z"
keychain_lib: "@napi-rs/keyring@^1.2.0"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-18T18:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-000-04: TokenStore Abstraction (Keychain + File Fallback)

**Complexity:** L2 — one native dep, two implementations, fallback logic.

## 1. The Spec
`TokenStore` interface with `save / load / remove(profile)`. Two implementations: `KeychainTokenStore` (via chosen keychain library) and `FileTokenStore` (`~/.cleargate/auth.json` chmod 600). Factory picks keychain when available, falls back to file with a warning.

### Detailed Requirements
- Factory: try keychain first, catch "not available" → file fallback + stderr warning
- File path: `~/.cleargate/auth.json`, created with mode 0600
- Profiles: keyed by profile name; default profile = "default"
- Never print plaintext refresh token to stdout or logs

## 2. Acceptance
```gherkin
Scenario: macOS keychain save/load roundtrip
  Given a macOS host
  When save("default", "token-123") then load("default")
  Then returns "token-123"

Scenario: Headless Linux falls back to file
  Given a Linux host without libsecret
  When save("default", "token-123")
  Then ~/.cleargate/auth.json exists (mode 0600) containing the token
  And stderr emitted a "keychain unavailable" warning

Scenario: Remove clears the profile
  After save("work", "t")
  When remove("work")
  Then load("work") returns null
```

## 3. Implementation
- `cleargate-cli/src/auth/token-store.ts` — interface
- `cleargate-cli/src/auth/keychain-store.ts` — native
- `cleargate-cli/src/auth/file-store.ts` — fallback
- `cleargate-cli/src/auth/factory.ts` — picker

## 4. Quality Gates
- Unit tests with mocked keychain + real tmp dir for file fallback
- Manual smoke test on macOS and Linux VM before release

## 6. Open question
1. **Keychain library final pick** — `keytar` vs `@napi-rs/keyring`. Decide at implementation time based on Node 22 prebuilt binary availability. *Default: `@napi-rs/keyring` (newer, better Node 22 support).*

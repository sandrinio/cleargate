# ClearGate Flashcards

One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
Format: `YYYY-MM-DD · #tags · lesson`

---

2026-04-18 · #cli #plaintext-redact · Plaintext secrets (refresh/invite/api tokens) must never be spread into log objects; reach into the response with named field access and write only the bare string to stdout. redactSensitive covers debug paths.
2026-04-18 · #zod #drift-detection · When vendoring response schemas in a CLI from a server's hand-authored OpenAPI snapshot, add a snapshot-drift unit test that reads the snapshot file at runtime and asserts schema field-set equality. Vitest snapshot files use JS syntax with trailing commas — strip before JSON.parse.
2026-04-18 · #admin-jwt #file-shape · Admin JWT file ~/.cleargate/admin-auth.json is a single-token shape {version,token}, NOT a profile-map TokenStore — distinct security/UX domains.
2026-04-18 · #fastify #ctp-empty-body · Fastify 5 throws FST_ERR_CTP_EMPTY_JSON_BODY when Content-Type: application/json is set with empty body; HTTP clients must omit the header on no-body requests (DELETE).
2026-04-18 · #monorepo #npm-workspaces · Adopt npm workspaces only when first cross-package import lands; root-package.json adoption forces sibling reinstall and may break working test suites — verify with npm test --workspace=<pkg> immediately after npm install.
2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.
2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.
2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every write for security-sensitive files.
2026-04-18 · #tsup #cjs #esm · Top-level await breaks CJS emit in tsup/esbuild; use `void program.parseAsync()` instead.


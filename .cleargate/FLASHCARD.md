# ClearGate Flashcards

One-liner gotcha log. Newest first. Grep by tag (e.g. `grep '#schema'`).
Format: `YYYY-MM-DD · #tags · lesson`

---

2026-04-18 · #vitest #vi-mock #native-modules · vi.mock('@napi-rs/keyring') replaces module before native binary loads; required for testing native deps on libsecret-less CI.
2026-04-18 · #keyring #napi #api-mismatch · @napi-rs/keyring Entry.getPassword() returns string | null (not throws NoEntry); handle both null return AND catch for robustness.
2026-04-18 · #keyring #napi #posix-modes · fs.writeFile(path, data, {mode}) only sets mode on creation; call fs.chmod explicitly after every write for security-sensitive files.
2026-04-18 · #tsup #cjs #esm · Top-level await breaks CJS emit in tsup/esbuild; use `void program.parseAsync()` instead.


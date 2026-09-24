# Standalone Codex release qualification

Sol research completed 2026-09-12, using a read-only ephemeral Codex execution
with the ClearGate architect-reader profile. No installer, credentials, trust,
or global configuration was changed during research.

The exact standalone `0.154.0-alpha.6.2` is available as an official pre-release:
[OpenAI GitHub release](https://github.com/openai/codex/releases/tag/rust-v0.154.0-alpha.6.2).
No availability-driven pin change is necessary.

For Darwin ARM64, the official installer package is
[`codex-package-aarch64-apple-darwin.tar.gz`](https://releases.openai.com/codex/releases/0.154.0-alpha.6.2/codex-package-aarch64-apple-darwin.tar.gz).
Published archive SHA-256:
`9dbf155219c70542cf352661ffe7a7d86b96e378990904bc09e8b31a9a247adf`.
Sources: [release manifest](https://releases.openai.com/codex/releases/0.154.0-alpha.6.2/release.json)
and [package checksums](https://releases.openai.com/codex/releases/0.154.0-alpha.6.2/codex-package_SHA256SUMS).

This is the archive checksum, not the extracted executable checksum. The actual
download, file inventory, executable hash/version, dedicated host state, and
human-granted exact-hook trust remain separate checks. The prior embedded-binary
lifecycle probe does not automatically qualify the standalone artifact. No story
is Done from release availability, and no usage or host-hook evidence was invented.

## Download and isolated installation — verified 2026-09-12

Downloaded the package and publisher checksum list over HTTPS into newly created
`/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV`.
Actual archive SHA-256 matches the published `9dbf1552…a247adf` exactly. Inspected
the complete archive member list before extraction: only relative package paths
under `bin`, `codex-path`, `codex-resources`, and `codex-package.json`.

Extracted executable:
`/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex`.
Actual `--version`: `codex-cli 0.154.0-alpha.6.2`.
Actual binary SHA-256:
`1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa`.
Package manifest confirms layoutVersion 1, target `aarch64-apple-darwin`, entrypoint
`bin/codex`. No global installation or shell PATH modification was made.

The standalone executable hash differs from the embedded executable; retain both
identities and run qualification against this actual artifact. Authentication and
exact-hook trust were not copied or granted by this installation.

## Dedicated account-state check

Created fresh dedicated home
`/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-home-8pZx6h`.
Running the standalone binary's `login status` with `CODEX_HOME` set to that path
returned exit 1 and `Not logged in`. No credential file was read/copied and no
login or trust grant was attempted. This is a known live-acceptance prerequisite;
it does not prevent local implementation, deterministic tests, packing, or
development-only probes under the existing authenticated host state.

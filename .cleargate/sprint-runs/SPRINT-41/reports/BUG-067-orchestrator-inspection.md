# BUG-067 adjacent write-path finding

Read-only inspection of isolated CLI baseline `33648024bb7d829506858cfed8899279133813ac`.
The three reported positional checks are confirmed in `src/lib/stamp-frontmatter.ts:54`,
`src/commands/stamp-tokens.ts:92`, and `src/wiki/parse-frontmatter.ts:18`.

The fresh-authoring goal also executes `gate check`, which can write a cached
verdict through `src/lib/frontmatter-cache.ts:82,120`. That writer currently
reconstructs only serialized frontmatter plus parsed body. A parser change that
returns a separate preamble, combined with fixes only in the two stamp writers,
would let gate caching silently discard the leading instructions. Include this
actual adjacent writer in the BUG-067 architecture/surface review before coding.
Do not weaken the scaffold's verbatim-instructions contract or claim success
from parsed keys alone; assert the original preamble/body survive the complete
new → stamp/stamp-tokens → gate/cache chain.

Other serializer consumers exist in push/pull/sync; inventory their compatibility
with any additive parser metadata without silently expanding BUG-067 into remote
lifecycle redesign. No remote command was invoked. The cached-verdict freshness
idempotence issue discovered at preflight is separate and was handled by real
cache invalidation/re-evaluation; this finding concerns preamble preservation,
not permission to redesign readiness timestamps.

No code, raw acceptance, or state was changed by this inspection. Architect must
choose the smallest shared locator/replacement API and exact additional surfaces.

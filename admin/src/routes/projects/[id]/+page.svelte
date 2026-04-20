<script lang="ts">
  /**
   * /projects/[id] — Overview page — STORY-006-04
   *
   * Client-side only (M3 §2 — no +page.server.ts).
   * Fetches members + tokens in parallel via Promise.allSettled.
   * Renders three value chips: members, tokens, created-at.
   * Items chip deferred — STORY-006-06 will add the items endpoint (M3 §9.3).
   *
   * Design Guide §6.3 value chips:
   *   rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1
   */
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import { get as mcpGet } from '$lib/mcp-client.js';
  import { MemberSchema, TokenMetaSchema } from 'cleargate/admin-api';
  import { z } from 'zod';

  const projectId = $derived($page.params.id);
  const projectCtx = getContext<{ name: string; createdAt: string; loading: boolean }>('projectContext');

  // Inline envelope schemas per M3 §5 guidance (no barrel envelope schemas)
  // Note: MemberSchema.status will be widened to include 'expired' by Dev C (STORY-006-05)
  // Until then, use passthrough on status to avoid throwing on 'expired' rows.
  const MembersListSchema = z.object({
    members: z.array(MemberSchema.extend({ status: z.string() })),
  }).strict();

  const TokensListSchema = z.object({
    tokens: z.array(TokenMetaSchema),
  }).strict();

  type LoadState = 'loading' | 'loaded' | 'error';

  let loadState = $state<LoadState>('loading');
  let memberCount = $state<number | null>(null);
  let tokenCount = $state<number | null>(null);
  let membersError = $state<boolean>(false);
  let tokensError = $state<boolean>(false);

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  $effect(() => {
    const id = projectId;
    loadState = 'loading';
    membersError = false;
    tokensError = false;

    const membersP = mcpGet(`/projects/${id}/members`, MembersListSchema);
    const tokensP = mcpGet(`/projects/${id}/tokens`, TokensListSchema);

    Promise.allSettled([membersP, tokensP]).then(([membersR, tokensR]) => {
      if (membersR.status === 'fulfilled') {
        memberCount = membersR.value.members.length;
      } else {
        membersError = true;
      }
      if (tokensR.status === 'fulfilled') {
        tokenCount = tokensR.value.tokens.length;
      } else {
        tokensError = true;
      }
      loadState = 'loaded';
    });
  });
</script>

<!-- Overview content -->
<div class="space-y-6">
  {#if loadState === 'loading'}
    <!-- Skeleton while loading -->
    <div class="flex gap-4 flex-wrap">
      {#each [1, 2, 3] as _}
        <div class="h-8 w-28 bg-base-200 rounded-full animate-pulse"></div>
      {/each}
    </div>
  {:else if loadState === 'loaded' || loadState === 'error'}
    <!-- Value chips — Design Guide §6.3 -->
    <div class="flex gap-3 flex-wrap" aria-label="Project overview">
      <!-- Members chip -->
      {#if membersError}
        <span
          class="rounded-full bg-error text-error-content text-sm font-semibold px-3 py-1"
          role="status"
        >
          Members unavailable
        </span>
      {:else}
        <span class="rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1">
          {memberCount ?? '—'} members
        </span>
      {/if}

      <!-- Tokens chip -->
      {#if tokensError}
        <span
          class="rounded-full bg-error text-error-content text-sm font-semibold px-3 py-1"
          role="status"
        >
          Tokens unavailable
        </span>
      {:else}
        <span class="rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1">
          {tokenCount ?? '—'} tokens
        </span>
      {/if}

      <!-- Created-at chip (from layout context) -->
      <span class="rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1">
        Created {projectCtx?.createdAt ? formatDate(projectCtx.createdAt) : '—'}
      </span>
    </div>

    <!-- Recent activity placeholder — full feed in later sprint -->
    <div class="bg-base-100 rounded-3xl shadow-card p-6">
      <h2 class="text-lg font-semibold text-base-content mb-2">Recent activity</h2>
      <p class="text-sm text-[#6B7280]">Activity feed coming in a future sprint.</p>
    </div>
  {/if}
</div>

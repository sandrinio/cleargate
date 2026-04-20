<script lang="ts">
  /**
   * /projects/[id]/items — Items Browser — STORY-006-06
   *
   * Client-side only (no +page.server.ts; mcp-client is browser-only).
   * Fetches paginated items from GET /admin-api/v1/projects/:id/items
   *
   * Features:
   * - Cursor pagination (Next only; no Prev in v1)
   * - Type filter (single-select: epic | story | cr | bug | proposal | All)
   * - Client-side CLID search (no network request)
   * - URL sync for cursor and type via goto({ keepFocus, noScroll })
   *
   * Design Guide §6.1 table, §6.2 type tags.
   * Svelte 5 runes only — no $: reactive blocks.
   */

  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { get as mcpGet } from '$lib/mcp-client.js';
  import { ItemsListResponseSchema } from 'cleargate/admin-api';
  import type { ItemSummary } from 'cleargate/admin-api';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { relative } from '$lib/utils/time-ago.js';

  // ── Constants ────────────────────────────────────────────────────────────────

  const ITEM_TYPES = ['epic', 'story', 'cr', 'bug', 'proposal'] as const;
  type ItemType = typeof ITEM_TYPES[number];

  /** Per-type tag color classes (Design Guide §6.2 neutral tags) */
  const TYPE_COLORS: Record<string, string> = {
    epic: 'bg-primary/10 text-primary',
    story: 'bg-secondary/10 text-secondary',
    cr: 'bg-base-200 text-base-content',
    bug: 'bg-error/10 text-error',
    proposal: 'bg-base-300 text-base-content',
  };

  // ── State ────────────────────────────────────────────────────────────────────

  const projectId = $derived($page.params['id'] ?? '');

  let items = $state<ItemSummary[]>([]);
  let nextCursor = $state<string | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Client-side CLID search
  let searchTerm = $state('');

  // Filtered view — client-side CLID search on current page
  const filteredItems = $derived(
    searchTerm.trim()
      ? items.filter((item) =>
          item.cleargate_id.toLowerCase().includes(searchTerm.trim().toLowerCase()),
        )
      : items,
  );

  // ── Data loading ─────────────────────────────────────────────────────────────

  async function fetchItems(id: string, cursor: string | null, type: string | null) {
    loading = true;
    error = null;

    const params = new URLSearchParams();
    params.set('limit', '50');
    if (cursor) params.set('cursor', cursor);
    if (type) params.set('type', type);

    const qs = params.toString();
    const path = `/projects/${id}/items${qs ? `?${qs}` : ''}`;

    try {
      const data = await mcpGet(path, ItemsListResponseSchema);
      items = data.items;
      nextCursor = data.next_cursor;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load items. Please try again.';
      console.error('[items] fetch error:', err);
    } finally {
      loading = false;
    }
  }

  // ── URL sync ─────────────────────────────────────────────────────────────────

  function updateUrl(cursor: string | null, type: string | null) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    if (type) params.set('type', type);
    const qs = params.toString();
    const base = `/projects/${projectId}/items`;
    const url = qs ? `${base}?${qs}` : base;
    goto(url, { keepFocus: true, noScroll: true });
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  function handleTypeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    const type = val || null;
    updateUrl(null, type); // reset cursor on filter change
  }

  function handleNext() {
    if (!nextCursor) return;
    const typeParam = $page.url.searchParams.get('type');
    updateUrl(nextCursor, typeParam);
  }

  // ── Effect: re-fetch when URL changes ────────────────────────────────────────

  $effect(() => {
    const id = projectId;
    const urlParams = $page.url.searchParams;
    const cursor = urlParams.get('cursor');
    const type = urlParams.get('type');
    void fetchItems(id, cursor, type);
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function typeColorClass(type: string): string {
    return TYPE_COLORS[type] ?? 'bg-base-200 text-base-content';
  }

  function shortMemberId(id: string | null): string {
    if (!id) return '—';
    const parts = id.split('-');
    return parts[0] ?? id.slice(0, 8);
  }
</script>

<!-- Items Browser — STORY-006-06 -->
<div class="space-y-6" data-testid="items-page">

  <!-- Page header -->
  <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
    <h2 class="text-xl font-semibold text-base-content">Items</h2>

    <div class="flex flex-wrap items-center gap-3">
      <!-- Client-side CLID search -->
      <input
        type="search"
        class="input input-sm input-bordered rounded-full w-48 text-sm"
        placeholder="Search CLID…"
        bind:value={searchTerm}
        aria-label="Search by CLID"
        data-testid="clid-search"
      />

      <!-- Type filter -->
      <div>
        <label for="type-select" class="sr-only">Filter by type</label>
        <select
          id="type-select"
          class="select select-sm select-bordered rounded-full text-sm"
          value={$page.url.searchParams.get('type') ?? ''}
          onchange={handleTypeChange}
          data-testid="type-select"
        >
          <option value="">All types</option>
          {#each ITEM_TYPES as t}
            <option value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Loading skeleton -->
  {#if loading}
    <div class="space-y-2" aria-label="Loading items" data-testid="skeleton">
      {#each [1, 2, 3, 4, 5, 6] as _}
        <div class="h-12 bg-base-200 rounded-xl animate-pulse"></div>
      {/each}
    </div>

  <!-- Error state -->
  {:else if error}
    <div
      class="rounded-2xl bg-error/10 border border-error/30 px-4 py-4 text-sm text-error"
      role="alert"
      data-testid="error-state"
    >
      <p class="font-semibold mb-1">Failed to load items</p>
      <p class="text-xs">{error}</p>
    </div>

  <!-- Empty state -->
  {:else if items.length === 0}
    <EmptyState
      headline="No items synced yet."
      supporting="Items appear here as agents call push_item."
    />

  <!-- Table -->
  {:else}
    <!-- Desktop table -->
    <div class="hidden md:block overflow-x-auto" data-testid="items-table-desktop">
      <table class="w-full" aria-label="Synced items">
        <thead>
          <tr>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">CLID</th>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Type</th>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Title</th>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Status</th>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Version</th>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Last pushed</th>
            <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3" scope="col">Pushed by</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredItems as item (item.id)}
            <tr class="border-b border-[#ECE8E1] hover:bg-base-50 transition-colors" data-testid="item-row">
              <!-- CLID — link to detail -->
              <td class="py-3 pr-4">
                <a
                  href="/projects/{projectId}/items/{item.cleargate_id}"
                  class="text-sm font-mono text-primary hover:underline"
                  data-testid="item-clid-link"
                >
                  {item.cleargate_id}
                </a>
              </td>

              <!-- Type tag -->
              <td class="py-3 pr-4">
                <span
                  class="rounded-full text-xs font-semibold px-2.5 py-0.5 {typeColorClass(item.type)}"
                  data-testid="type-tag"
                >
                  {item.type}
                </span>
              </td>

              <!-- Title -->
              <td class="py-3 pr-4 text-sm text-base-content max-w-[300px] truncate" title={item.title}>
                {item.title}
              </td>

              <!-- Status -->
              <td class="py-3 pr-4 text-sm text-[#6B7280]">
                {item.status}
              </td>

              <!-- Version -->
              <td class="py-3 pr-4 text-sm text-[#6B7280] font-mono">
                v{item.version}
              </td>

              <!-- Last pushed (time-ago) -->
              <td class="py-3 pr-4 text-sm text-[#6B7280] whitespace-nowrap">
                {#if item.last_pushed_at}
                  <span
                    class="tooltip tooltip-bottom cursor-default"
                    data-tip={item.last_pushed_at}
                    title={item.last_pushed_at}
                  >
                    {relative(item.last_pushed_at)}
                  </span>
                {:else}
                  —
                {/if}
              </td>

              <!-- Pushed by (short member ID) -->
              <td class="py-3 text-sm text-[#6B7280] font-mono">
                {shortMemberId(item.pushed_by_member_id)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile card stack -->
    <div class="md:hidden space-y-3" data-testid="items-table-mobile">
      {#each filteredItems as item (item.id)}
        <a
          href="/projects/{projectId}/items/{item.cleargate_id}"
          class="block bg-base-100 rounded-2xl shadow-card p-4 space-y-2 hover:bg-base-200 transition-colors"
          data-testid="item-card"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-mono text-primary truncate">{item.cleargate_id}</p>
              <p class="text-sm font-medium text-base-content mt-0.5 truncate">{item.title}</p>
            </div>
            <span class="rounded-full text-xs font-semibold px-2.5 py-0.5 flex-shrink-0 {typeColorClass(item.type)}">
              {item.type}
            </span>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-[#6B7280]">
            <span>{item.status}</span>
            <span>v{item.version}</span>
            {#if item.last_pushed_at}
              <span>{relative(item.last_pushed_at)}</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>

    <!-- No results from client-side search -->
    {#if filteredItems.length === 0 && searchTerm.trim()}
      <p class="text-sm text-[#6B7280] text-center py-4" data-testid="no-search-results">
        No items matching "{searchTerm}"
      </p>
    {/if}

    <!-- Pagination -->
    <div class="flex justify-center pt-2">
      {#if nextCursor !== null}
        <button
          type="button"
          class="btn btn-ghost rounded-full border border-[#ECE8E1]"
          onclick={handleNext}
          disabled={loading}
          data-testid="next-btn"
        >
          Next
        </button>
      {/if}
    </div>
  {/if}

</div>

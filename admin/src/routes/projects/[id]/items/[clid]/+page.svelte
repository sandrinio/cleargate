<script lang="ts">
  /**
   * /projects/[id]/items/[clid] — Item Detail + Version History — STORY-006-06
   *
   * Client-side only (no +page.server.ts; mcp-client is browser-only).
   *
   * Fetches:
   *   GET /admin-api/v1/projects/:id/items?type=<any>&cursor=<any> to get item details
   *   GET /admin-api/v1/items/:cleargate_id/versions  — flat path (not nested)
   *
   * Note: STORY-004-09 ships:
   *   - GET /admin-api/v1/projects/:project_id/items — paginated list
   *   - GET /admin-api/v1/items/:cleargate_id/versions — flat (NOT nested)
   *
   * For item detail, we call the list endpoint filtered to the specific clid
   * and pick the first result. The versions endpoint is flat.
   *
   * Design Guide §6.1 table, §6.6 timeline.
   * Svelte 5 runes only.
   */

  import { page } from '$app/stores';
  import { get as mcpGet } from '$lib/mcp-client.js';
  import { ItemsListResponseSchema, ItemVersionsResponseSchema } from 'cleargate/admin-api';
  import type { ItemSummary, ItemVersion } from 'cleargate/admin-api';
  import ItemTimeline from '$lib/components/ItemTimeline.svelte';
  import PayloadViewer from '$lib/components/PayloadViewer.svelte';
  import { relative } from '$lib/utils/time-ago.js';

  // ── State ────────────────────────────────────────────────────────────────────

  const projectId = $derived($page.params['id'] ?? '');
  const clid = $derived($page.params['clid'] ?? '');

  let item = $state<ItemSummary | null>(null);
  let versions = $state<ItemVersion[]>([]);
  let loading = $state(true);
  let notFound = $state(false);
  let error = $state<string | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────────

  async function fetchData(pid: string, targetClid: string) {
    loading = true;
    notFound = false;
    error = null;

    try {
      // Parallel fetch: item summary (from list filtered) + versions
      // The list endpoint supports fetching all types; we search for the clid client-side
      // Since there's no single-item GET, we fetch the list and find the matching item.
      // Versions endpoint is flat: /items/:cleargate_id/versions
      // TODO: replace list-and-filter-by-200 with GET /admin-api/v1/items/:cleargate_id when a future CR ships the single-item endpoint. Current approach silently misses items beyond position 200 in the project's sort order (rare: small projects).
      const [listData, versionsData] = await Promise.all([
        mcpGet(`/projects/${pid}/items?limit=200`, ItemsListResponseSchema),
        mcpGet(`/items/${encodeURIComponent(targetClid)}/versions`, ItemVersionsResponseSchema),
      ]);

      const found = listData.items.find((i) => i.cleargate_id === targetClid);
      if (!found) {
        notFound = true;
        item = null;
      } else {
        item = found;
      }

      versions = versionsData.versions;
    } catch (err) {
      // Check if 404
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('404') || message.includes('Not Found')) {
        notFound = true;
        item = null;
      } else {
        error = message || 'Failed to load item details.';
        console.error('[item-detail] fetch error:', err);
      }
    } finally {
      loading = false;
    }
  }

  // ── Effect: fetch on route change ────────────────────────────────────────────

  $effect(() => {
    const pid = projectId;
    const targetClid = clid;
    if (pid && targetClid) {
      void fetchData(pid, targetClid);
    }
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function shortMemberId(id: string | null): string {
    if (!id) return '—';
    const parts = id.split('-');
    return parts[0] ?? id.slice(0, 8);
  }

  /** Build version entries for timeline — attach stub payload placeholder */
  const timelineVersions = $derived(
    versions.map((v) => ({
      version: v.version,
      pushed_by_member_id: v.pushed_by_member_id,
      pushed_at: v.pushed_at,
      status: v.status,
      diff_summary: v.diff_summary,
    })),
  );
</script>

<!-- Item Detail — STORY-006-06 -->
<div class="space-y-8" data-testid="item-detail-page">

  <!-- Back link -->
  <a
    href="/projects/{projectId}/items"
    class="inline-flex items-center gap-1 text-sm text-[#6B7280] hover:text-primary transition-colors"
    data-testid="back-link"
  >
    ← Back to items
  </a>

  <!-- Loading skeleton -->
  {#if loading}
    <div class="space-y-4" aria-label="Loading item" data-testid="skeleton">
      <div class="h-8 w-64 bg-base-200 rounded-full animate-pulse"></div>
      <div class="h-4 w-48 bg-base-200 rounded-full animate-pulse"></div>
      <div class="h-32 bg-base-200 rounded-xl animate-pulse"></div>
    </div>

  <!-- 404 state -->
  {:else if notFound}
    <div
      class="rounded-2xl bg-base-200 border border-[#ECE8E1] px-6 py-8 text-center"
      role="alert"
      data-testid="not-found-state"
    >
      <p class="text-lg font-semibold text-base-content mb-2">
        Item {clid} not found in this project
      </p>
      <p class="text-sm text-[#6B7280] mb-4">
        The item may have been deleted or does not belong to this project.
      </p>
      <a
        href="/projects/{projectId}/items"
        class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1]"
      >
        ← Back to items
      </a>
    </div>

  <!-- Error state -->
  {:else if error}
    <div
      class="rounded-2xl bg-error/10 border border-error/30 px-4 py-4 text-sm text-error"
      role="alert"
      data-testid="error-state"
    >
      <p class="font-semibold mb-1">Failed to load item</p>
      <p class="text-xs">{error}</p>
    </div>

  <!-- Item detail -->
  {:else if item}
    <!-- Header card -->
    <div class="bg-base-100 rounded-3xl shadow-card p-6 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div class="min-w-0">
          <p class="text-xs font-mono text-[#6B7280] mb-1">{item.cleargate_id}</p>
          <h2 class="text-2xl font-bold text-base-content break-words">{item.title}</h2>
        </div>
        <div class="flex flex-wrap gap-2 flex-shrink-0">
          <!-- Type tag -->
          <span class="rounded-full text-xs font-semibold px-2.5 py-1 bg-base-200 text-base-content" data-testid="detail-type">
            {item.type}
          </span>
          <!-- Status -->
          <span class="rounded-full text-xs font-semibold px-2.5 py-1 bg-base-200 text-base-content" data-testid="detail-status">
            {item.status}
          </span>
        </div>
      </div>

      <!-- Meta row -->
      <div class="flex flex-wrap gap-4 text-xs text-[#6B7280]">
        <span>Version <strong class="font-semibold text-base-content">v{item.version}</strong></span>
        {#if item.last_pushed_at}
          <span>Last pushed <strong class="font-semibold text-base-content">{relative(item.last_pushed_at)}</strong></span>
        {/if}
        {#if item.pushed_by_member_id}
          <span>By <strong class="font-mono font-semibold text-base-content">{shortMemberId(item.pushed_by_member_id)}</strong></span>
        {/if}
      </div>
    </div>

    <!-- Current payload — rendered from item.current_payload (SPRINT-08 follow-up) -->
    {#if item.current_payload && Object.keys(item.current_payload).length > 0}
      <div class="bg-base-100 rounded-3xl shadow-card p-6">
        <h3 class="text-lg font-semibold text-base-content mb-4">Current payload (v{item.version})</h3>
        <PayloadViewer payload={item.current_payload} />
      </div>
    {/if}

    <!-- Version history section -->
    <div class="bg-base-100 rounded-3xl shadow-card p-6">
      <h3 class="text-lg font-semibold text-base-content mb-4">Version history</h3>

      <ItemTimeline
        versions={timelineVersions}
        totalPushed={item.version}
      />
    </div>

  {/if}

</div>

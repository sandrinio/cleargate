<script lang="ts">
  /**
   * /projects/[id]/stats — Stats page — STORY-006-08
   *
   * Client-side only. No +page.server.ts (flashcard #mcp-client browser-only).
   * All data fetched in onMount / $effect from mcp-client.ts.
   *
   * Accepted shape (M4 plan §ENDPOINT-SHAPE VERIFICATION, overrides story §1 prose):
   *   {
   *     window: '7d' | '30d' | '90d',
   *     requests_per_day: Array<{ date: string, count: number }>,
   *     error_rate: number,   // 0..1
   *     top_items: Array<{ cleargate_id: string, writes: number }>
   *   }
   *
   * Orchestrator decisions applied:
   *   - 2 chips only (Requests total + Error rate). No unique_actors chip.
   *   - Tooltip: "<date>: <count> requests" — no error count.
   *   - top_items keys: cleargate_id + writes (not clid/push_count/last_push_at).
   *
   * Design Guide refs: §6.3 value chips, §6.4 segmented control, §6.7 table, §8 chart
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get as mcpGet } from '$lib/mcp-client.js';
  import { z } from 'zod';
  import { NetworkError } from '$lib/errors.js';
  import ValueChip from '$lib/components/ValueChip.svelte';
  import WindowSelector from '$lib/components/WindowSelector.svelte';
  import RequestsChart from '$lib/components/RequestsChart.svelte';
  import Card from '$lib/components/Card.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { BarChart2 } from 'lucide-svelte';

  // ---- Inline Zod schema matching verified server shape (M4 §ENDPOINT-SHAPE) ----
  const StatsSchema = z.object({
    window: z.enum(['7d', '30d', '90d']),
    requests_per_day: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      }),
    ),
    error_rate: z.number(),
    top_items: z.array(
      z.object({
        cleargate_id: z.string(),
        writes: z.number(),
      }),
    ),
  });

  type StatsData = z.infer<typeof StatsSchema>;

  // ---- State ----
  type LoadState = 'loading' | 'loaded' | 'error';

  let loadState: LoadState = $state('loading');
  // Using generic form for nullable states (consistent with members page pattern)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stats = $state<StatsData | null>(null);
  let errorStatus = $state<number | null>(null);

  // Derive active window from URL — default 30d
  const VALID_WINDOWS = ['7d', '30d', '90d'] as const;
  type Window = (typeof VALID_WINDOWS)[number];

  let activeWindow: Window = $derived(
    (() => {
      const raw = $page.url.searchParams.get('window');
      return (VALID_WINDOWS.includes(raw as Window) ? raw : '30d') as Window;
    })(),
  );

  let projectId: string = $derived($page.params['id'] ?? '');

  // ---- Derived stats ----
  // Compute these as regular functions called in template to avoid $derived typing issues
  function getTotalRequests(): number {
    if (!stats) return 0;
    return stats.requests_per_day.reduce((sum, d) => sum + d.count, 0);
  }

  function getErrorRateDisplay(): string {
    if (!stats) return '—';
    const total = getTotalRequests();
    if (total === 0) return '—';
    return `${(stats.error_rate * 100).toFixed(1)}%`;
  }

  function getActiveDataDays(): number {
    if (!stats) return 0;
    return stats.requests_per_day.filter((d) => d.count > 0).length;
  }

  let totalRequests: number = $derived(getTotalRequests());
  let errorRateDisplay: string = $derived(getErrorRateDisplay());
  let activeDataDays: number = $derived(getActiveDataDays());
  // Cast loadState to string to avoid Svelte's narrowing comparing literal types
  let showSparseHint: boolean = $derived(activeDataDays < 3 && (loadState as string) === 'loaded');
  let showEmptyOverlay: boolean = $derived(totalRequests === 0 && (loadState as string) === 'loaded');

  // ---- Fetch ----
  async function loadStats(): Promise<void> {
    if (!projectId) return;
    loadState = 'loading';
    errorStatus = null;
    try {
      const data = await mcpGet(`/projects/${projectId}/stats?window=${activeWindow}`, StatsSchema);
      stats = data;
      loadState = 'loaded';
    } catch (err) {
      console.error('[stats] failed to load stats', err);
      if (err instanceof NetworkError) {
        errorStatus = err.status;
      }
      loadState = 'error';
    }
  }

  // Re-fetch when window or projectId changes
  $effect(() => {
    // Reactive: re-run when activeWindow or projectId changes
    void activeWindow;
    void projectId;
    loadStats();
  });

  onMount(() => {
    // Initial load already handled by $effect above
  });
</script>

<svelte:head>
  <title>Stats — ClearGate Admin</title>
</svelte:head>

<!-- Page header -->
<div class="flex items-center justify-between mb-6 flex-wrap gap-4">
  <h1 class="text-2xl font-bold text-base-content">Stats</h1>
  <WindowSelector />
</div>

{#if loadState === 'loading'}
  <!-- Loading skeleton -->
  <div class="space-y-6" data-testid="stats-loading">
    <!-- Chip skeletons -->
    <div class="flex gap-4 flex-wrap">
      <div class="skeleton h-8 w-28 rounded-full"></div>
      <div class="skeleton h-8 w-28 rounded-full"></div>
    </div>
    <!-- Chart skeleton -->
    <div class="skeleton w-full h-64 rounded-2xl"></div>
    <!-- Table skeleton -->
    <div class="space-y-2">
      {#each Array(5) as _, i (i)}
        <div class="skeleton h-10 w-full rounded-xl"></div>
      {/each}
    </div>
  </div>
{:else if loadState === 'error'}
  <!-- Error state: inline retry banner -->
  <div
    class="flex items-center gap-4 bg-error/10 border border-error/30 rounded-2xl p-4"
    data-testid="stats-error"
    role="alert"
  >
    <span class="text-error font-medium">
      {errorStatus ? `Stats unavailable (HTTP ${errorStatus})` : "Couldn't load stats"}
    </span>
    <button type="button" class="btn btn-sm btn-error rounded-full" onclick={() => loadStats()}>
      Retry
    </button>
  </div>
{:else if loadState === 'loaded' && stats}
  <!-- Summary chips row: 2 chips (Requests + Error rate) -->
  <div class="flex gap-6 flex-wrap mb-6" data-testid="stats-chips">
    <ValueChip label="Requests" value={String(totalRequests)} />
    <ValueChip label="Error rate" value={errorRateDisplay} />
  </div>

  <!-- Chart card -->
  <Card class="mb-6">
    <div class="relative">
      {#if showEmptyOverlay}
        <!-- Empty overlay when no activity -->
        <div
          class="absolute inset-0 flex items-center justify-center z-10 bg-base-100/80 rounded-2xl"
          data-testid="chart-empty-overlay"
        >
          <span class="text-base-content/50 text-sm font-medium">
            No activity in this window
          </span>
        </div>
      {/if}
      <RequestsChart data={stats.requests_per_day} />
    </div>

    {#if showSparseHint}
      <p class="text-sm text-base-content/50 mt-3 text-center" data-testid="sparse-hint">
        Not much activity yet — stats fill in as your team uses ClearGate.
      </p>
    {/if}
  </Card>

  <!-- Top-10 items list -->
  <Card>
    <h2 class="text-lg font-semibold text-base-content mb-4">Top items</h2>

    {#if stats.top_items.length === 0}
      <EmptyState
        headline="No items yet"
        supporting="Items appear here as agents call push_item."
      >
        {#snippet icon()}
          <BarChart2 size={48} class="text-base-content/30" />
        {/snippet}
      </EmptyState>
    {:else}
      <!-- Design Guide §6.7 table pattern -->
      <div class="overflow-x-auto" data-testid="top-items-table">
        <table class="table table-sm w-full">
          <thead>
            <tr class="border-b border-base-200">
              <th class="text-left text-xs font-medium text-base-content/50 py-2">Item ID</th>
              <th class="text-right text-xs font-medium text-base-content/50 py-2">Writes</th>
            </tr>
          </thead>
          <tbody>
            {#each stats.top_items.slice(0, 10) as item (item.cleargate_id)}
              <tr class="border-b border-base-200/50 hover:bg-base-200/30 transition-colors">
                <td class="py-3">
                  <!-- Link to item detail if items route exists; else plain text (STORY-006-06 TBD) -->
                  <a
                    href="/projects/{projectId}/items/{item.cleargate_id}"
                    class="text-primary hover:underline font-mono text-sm"
                    data-testid="item-link-{item.cleargate_id}"
                  >
                    {item.cleargate_id}
                  </a>
                </td>
                <td class="text-right py-3 tabular-nums text-sm font-medium text-base-content">
                  {item.writes}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
{/if}

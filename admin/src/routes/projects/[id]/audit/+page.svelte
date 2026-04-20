<script lang="ts">
  /**
   * /projects/[id]/audit — Audit Log Viewer — STORY-006-07
   *
   * Client-side only (no +page.server.ts; mcp-client is browser-only).
   * All data fetched in $effect via mcpGet.
   *
   * Spec (authoritative from M4.md):
   *   - Actor filter: user=<UUID> (NOT email). Members fetched for UUID→email map.
   *   - Row keys: member_id, acting_user, tool, target_cleargate_id, result, error_code.
   *   - 30d cap: CLIENT-SIDE clamp; server does not enforce.
   *   - URL sync: $page.url + goto({ keepFocus: true, noScroll: true }).
   *   - Default date range: last 7 days.
   *   - result field values: 'ok' | 'error' (confirmed from audit.ts).
   */
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { z } from 'zod';
  import { get as mcpGet } from '$lib/mcp-client.js';
  import { toastStore } from '$lib/stores/toast.js';
  import { MemberSchema } from 'cleargate/admin-api';
  import DateRangePicker from '$lib/components/DateRangePicker.svelte';
  import MultiSelect from '$lib/components/MultiSelect.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { parseFilters, filtersToParams, defaultFilters, clamp30d } from '$lib/utils/url-state.js';
  import type { AuditFilters } from '$lib/utils/url-state.js';

  // ── Schemas ─────────────────────────────────────────────────────────────────

  const MembersListSchema = z.object({
    members: z.array(
      MemberSchema.extend({ status: z.enum(['pending', 'active', 'expired']) }),
    ),
  }).strict();

  const AuditRowSchema = z.object({
    id: z.string(),
    timestamp: z.string(),
    member_id: z.string().nullable(),
    acting_user: z.string().nullable(),
    tool: z.string(),
    target_cleargate_id: z.string().nullable(),
    result: z.string(),           // 'ok' | 'error'
    error_code: z.string().nullable(),
    ip_address: z.string().nullable().optional(),
    user_agent: z.string().nullable().optional(),
  });

  const AuditResponseSchema = z.object({
    rows: z.array(AuditRowSchema),
    next_cursor: z.string().nullable(),
  });

  type AuditRow = z.infer<typeof AuditRowSchema>;
  type Member = z.infer<typeof MembersListSchema>['members'][number];

  // ── Constants ────────────────────────────────────────────────────────────────

  const KNOWN_TOOLS = [
    'push_item',
    'pull_item',
    'list_items',
    'sync_status',
    'join',
    'auth.exchange',
    'auth.device_login',
  ];
  // #tool-list-hygiene: this list requires manual update when MCP adds new audit tool_name values.

  // ── State ────────────────────────────────────────────────────────────────────

  const projectId = $derived($page.params['id'] ?? '');

  let members = $state<Member[]>([]);
  let rows = $state<AuditRow[]>([]);
  let nextCursor = $state<string | null>(null);
  let loading = $state(true);
  let loadingMore = $state(false);
  let clamped = $state(false);

  // Parse filters from URL on reactive $page.url change
  let filters = $state<AuditFilters>(defaultFilters());

  // Separate tool single-select (not multiselect) value
  let selectedTool = $state('');

  // UUID → email map for actor display
  const memberEmailMap = $derived(
    new Map(members.map((m) => [m.id, m.email])),
  );

  // Actor options for MultiSelect: { value: UUID, label: email }
  const actorOptions = $derived(
    members.map((m) => ({ value: m.id, label: m.email })),
  );

  // Selected actor UUIDs (from filters.user, which may be comma-separated or single)
  let selectedActors = $state<string[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Format ISO UTC timestamp for local display: "YYYY-MM-DD HH:mm:ss.SSS"
   */
  function formatTimestamp(iso: string): string {
    try {
      const d = new Date(iso);
      const pad = (n: number, len = 2) => String(n).padStart(len, '0');
      const YYYY = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const DD = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      const ms = pad(d.getMilliseconds(), 3);
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${ms}`;
    } catch {
      return iso;
    }
  }

  /**
   * Map acting_user or member_id to an email for display.
   * Falls back to acting_user string, then member_id, then 'Anonymous'.
   */
  function resolveActor(row: AuditRow): string {
    if (row.member_id && memberEmailMap.has(row.member_id)) {
      return memberEmailMap.get(row.member_id)!;
    }
    if (row.acting_user) return row.acting_user;
    return 'Anonymous';
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  async function loadMembers(id: string) {
    try {
      const data = await mcpGet(`/projects/${id}/members`, MembersListSchema);
      members = data.members;
    } catch {
      // Non-fatal — actor filter degrades to UUID display
    }
  }

  async function fetchAudit(id: string, f: AuditFilters, append = false) {
    if (append) {
      loadingMore = true;
    } else {
      loading = true;
    }

    const { filters: clamped_filters, clamped: wasClamped } = clamp30d(f);
    clamped = wasClamped;

    const params = filtersToParams(clamped_filters);
    const qs = params.toString();
    const path = `/projects/${id}/audit${qs ? `?${qs}` : ''}`;

    try {
      const data = await mcpGet(path, AuditResponseSchema);
      if (append) {
        rows = [...rows, ...data.rows];
      } else {
        rows = data.rows;
      }
      nextCursor = data.next_cursor;
    } catch (err) {
      toastStore.error('Failed to load audit log. Please try again.');
      console.error('[audit] fetch error:', err);
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  // ── URL sync ─────────────────────────────────────────────────────────────────

  function updateUrl(newFilters: AuditFilters) {
    const params = filtersToParams(newFilters);
    const qs = params.toString();
    const base = `/projects/${projectId}/audit`;
    const url = qs ? `${base}?${qs}` : base;
    goto(url, { keepFocus: true, noScroll: true });
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  function handleDateChange(range: { from: string; to: string }) {
    const newFilters: AuditFilters = { ...filters, from: range.from, to: range.to, cursor: null };
    filters = newFilters;
    selectedActors = selectedActors; // keep actors
    updateUrl(newFilters);
  }

  function handleActorChange(selected: string[]) {
    selectedActors = selected;
    const newFilters: AuditFilters = {
      ...filters,
      user: selected.length > 0 ? selected[0] : null, // API supports single UUID per spec
      cursor: null,
    };
    filters = newFilters;
    updateUrl(newFilters);
  }

  function handleToolChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    selectedTool = val;
    const newFilters: AuditFilters = { ...filters, tool: val || null, cursor: null };
    filters = newFilters;
    updateUrl(newFilters);
  }

  function handleReset() {
    const def = defaultFilters();
    filters = def;
    selectedActors = [];
    selectedTool = '';
    const base = `/projects/${projectId}/audit`;
    goto(base, { keepFocus: true, noScroll: true });
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    const newFilters: AuditFilters = { ...filters, cursor: nextCursor };
    filters = newFilters;
    await fetchAudit(projectId, newFilters, true);
  }

  // ── Effect: re-fetch when URL changes ────────────────────────────────────────

  $effect(() => {
    const id = projectId;
    const urlParams = $page.url.searchParams;
    const parsed = parseFilters(urlParams);

    // Apply defaults if no from/to in URL
    if (!parsed.from && !parsed.to) {
      const def = defaultFilters();
      filters = { ...def, user: parsed.user, tool: parsed.tool, cursor: parsed.cursor };
    } else {
      filters = parsed;
    }

    // Sync selectedActors from URL user param
    selectedActors = parsed.user ? [parsed.user] : [];
    selectedTool = parsed.tool ?? '';

    void fetchAudit(id, filters);
  });

  // ── Mount: fetch members for UUID→email map ───────────────────────────────────

  onMount(() => {
    if (projectId) {
      void loadMembers(projectId);
    }
  });
</script>

<!-- Audit Log Viewer — STORY-006-07 -->
<div class="space-y-6" data-testid="audit-page">

  <!-- Page header -->
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-semibold text-base-content">Audit Log</h2>
  </div>

  <!-- 30d clamp warning -->
  {#if clamped}
    <div
      class="rounded-2xl bg-warning/20 border border-warning/40 px-4 py-3 text-sm text-warning-content"
      role="alert"
      data-testid="clamp-warning"
    >
      Audit queries are capped at 30 days; showing the most recent 30 days.
    </div>
  {/if}

  <!-- Filter bar -->
  <div
    class="bg-base-100 rounded-3xl shadow-card p-4 flex flex-wrap items-end gap-4"
    data-testid="filter-bar"
  >
    <!-- Date range picker -->
    <div class="flex-1 min-w-[260px]">
      <p class="text-xs text-[#6B7280] font-medium mb-1">Date range</p>
      <DateRangePicker
        from={filters.from}
        to={filters.to}
        onchange={handleDateChange}
      />
    </div>

    <!-- Actor filter -->
    <div>
      <p class="text-xs text-[#6B7280] font-medium mb-1">Actor</p>
      <MultiSelect
        options={actorOptions}
        selected={selectedActors}
        placeholder="All actors"
        label="Filter by actor"
        onchange={handleActorChange}
      />
    </div>

    <!-- Tool filter -->
    <div>
      <label for="tool-select" class="text-xs text-[#6B7280] font-medium block mb-1">Tool</label>
      <select
        id="tool-select"
        class="select select-sm select-bordered rounded-full text-sm"
        value={selectedTool}
        onchange={handleToolChange}
        data-testid="tool-select"
      >
        <option value="">All tools</option>
        {#each KNOWN_TOOLS as tool}
          <option value={tool}>{tool}</option>
        {/each}
      </select>
    </div>

    <!-- Reset button -->
    <button
      type="button"
      class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1]"
      onclick={handleReset}
      data-testid="reset-btn"
    >
      Reset
    </button>
  </div>

  <!-- Table area -->
  <div class="relative" data-testid="table-area">

    <!-- Loading skeleton (initial load) -->
    {#if loading}
      <div class="space-y-2" aria-label="Loading audit rows" data-testid="skeleton">
        {#each [1, 2, 3, 4, 5, 6, 7, 8] as _}
          <div class="h-12 bg-base-200 rounded-xl animate-pulse"></div>
        {/each}
      </div>

    <!-- Empty state -->
    {:else if rows.length === 0}
      <EmptyState
        headline="No audit events in this window."
        supporting="Try widening the date range or removing filters."
      />

    <!-- Table -->
    {:else}
      <!-- Stale overlay during in-flight refetch: currently hidden (no in-flight indicator on rows during filter change because we show skeleton instead) -->

      <!-- Desktop table -->
      <div class="hidden md:block overflow-x-auto" data-testid="audit-table-desktop">
        <table class="w-full" aria-label="Audit log events">
          <thead>
            <tr>
              <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Timestamp</th>
              <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Actor</th>
              <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Tool</th>
              <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4" scope="col">Target</th>
              <th class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3" scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row (row.id)}
              <tr class="border-b border-[#ECE8E1]" data-testid="audit-row">
                <!-- Timestamp: local display + UTC tooltip -->
                <td class="py-3 pr-4 text-sm text-base-content font-mono whitespace-nowrap">
                  <span
                    class="tooltip tooltip-bottom cursor-default"
                    data-tip={row.timestamp}
                    title={row.timestamp}
                  >
                    {formatTimestamp(row.timestamp)}
                  </span>
                </td>

                <!-- Actor -->
                <td class="py-3 pr-4 text-sm text-[#6B7280] truncate max-w-[180px]">
                  {resolveActor(row)}
                </td>

                <!-- Tool -->
                <td class="py-3 pr-4 text-sm text-base-content">
                  <span class="font-mono text-xs bg-base-200 rounded px-1.5 py-0.5">{row.tool}</span>
                </td>

                <!-- Target (plain text — items route not yet shipped) -->
                <td class="py-3 pr-4 text-sm text-[#6B7280] font-mono">
                  {row.target_cleargate_id ?? '—'}
                </td>

                <!-- Result pill -->
                <td class="py-3">
                  {#if row.result === 'error'}
                    <span
                      class="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-error text-error-content"
                      data-testid="result-pill-error"
                    >
                      {row.error_code ? `error: ${row.error_code}` : 'error'}
                    </span>
                  {:else}
                    <span
                      class="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-success text-success-content"
                      data-testid="result-pill-ok"
                    >
                      ok
                    </span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile card stack -->
      <div class="md:hidden space-y-3" data-testid="audit-table-mobile">
        {#each rows as row (row.id)}
          <div class="bg-base-100 rounded-2xl shadow-card p-4 space-y-2" data-testid="audit-card">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs font-mono text-[#6B7280] truncate">{formatTimestamp(row.timestamp)}</p>
                <p class="text-sm font-medium text-base-content mt-0.5">{resolveActor(row)}</p>
              </div>
              {#if row.result === 'error'}
                <span class="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-error text-error-content flex-shrink-0">
                  {row.error_code ? `error: ${row.error_code}` : 'error'}
                </span>
              {:else}
                <span class="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-success text-success-content flex-shrink-0">
                  ok
                </span>
              {/if}
            </div>
            <div class="flex flex-wrap gap-2 text-xs text-[#6B7280]">
              <span class="font-mono bg-base-200 rounded px-1.5 py-0.5">{row.tool}</span>
              {#if row.target_cleargate_id}
                <span class="font-mono">{row.target_cleargate_id}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Pagination: Load more -->
  {#if !loading && rows.length > 0 && nextCursor !== null}
    <div class="flex justify-center pt-2">
      <button
        type="button"
        class="btn btn-ghost rounded-full border border-[#ECE8E1]"
        onclick={handleLoadMore}
        disabled={loadingMore}
        data-testid="load-more-btn"
      >
        {#if loadingMore}
          <span class="loading loading-spinner loading-sm mr-2"></span>
          Loading…
        {:else}
          Load more
        {/if}
      </button>
    </div>
  {/if}

</div>

<script lang="ts">
  /**
   * ItemTimeline — STORY-006-06
   *
   * Vertical timeline component for item version history.
   * Shows version entries newest-first with keyboard navigation.
   *
   * Design Guide §6.6 timeline / vertical list patterns.
   * Svelte 5 runes only — no $: reactive blocks.
   *
   * Accessibility: keyboard navigation between entries, Enter to expand.
   */

  import { relative } from '$lib/utils/time-ago.js';
  import PayloadViewer from './PayloadViewer.svelte';
  import { diffFields } from '$lib/utils/diff-fields.js';

  interface VersionEntry {
    version: number;
    pushed_by_member_id: string | null;
    pushed_at: string;
    status: string;
    diff_summary: string | null;
    payload?: Record<string, unknown>;
  }

  interface Props {
    versions: VersionEntry[];
    /** Show "Showing last N versions" meta line if pruned */
    totalPushed?: number;
  }

  let { versions, totalPushed }: Props = $props();

  // Sort newest first
  const sortedVersions = $derived([...versions].sort((a, b) => b.version - a.version));

  // Track expanded state per version number
  let expandedVersions = $state<Set<number>>(new Set());

  function toggleExpand(ver: number) {
    const next = new Set(expandedVersions);
    if (next.has(ver)) {
      next.delete(ver);
    } else {
      next.add(ver);
    }
    expandedVersions = next;
  }

  function handleKeydown(event: KeyboardEvent, ver: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpand(ver);
    }
  }

  /** Short display for member ID — trim to first 8 chars if long UUID, else show as-is */
  function shortMember(id: string | null): string {
    if (!id) return 'unknown';
    // If UUID-like (contains dashes), show first segment
    const parts = id.split('-');
    if (parts.length >= 2) return parts[0];
    return id.slice(0, 8);
  }

  /**
   * Compute diff summary between adjacent sorted versions.
   * For version at index `idx` in sortedVersions (newest-first),
   * the "previous" is at idx+1 (older version).
   */
  function computeDiff(idx: number): string[] {
    const current = sortedVersions[idx];
    const older = sortedVersions[idx + 1];
    if (!current || !older) return [];
    if (!current.payload || !older.payload) return [];
    return diffFields(older.payload, current.payload);
  }
</script>

<!--
  ItemTimeline — vertical rail with version entries
  Design Guide §6.6 (vertical timeline with dots)
-->
<div class="relative" data-testid="item-timeline">

  <!-- Meta line: pruning notice -->
  {#if totalPushed !== undefined && totalPushed > versions.length}
    <p class="text-xs text-[#6B7280] mb-4" data-testid="pruning-meta">
      Showing last {versions.length} versions
    </p>
  {/if}

  {#if sortedVersions.length === 0}
    <p class="text-sm text-[#6B7280] py-4" data-testid="empty-timeline">No version history available.</p>

  {:else if sortedVersions.length === 1}
    <!-- Single version — no expand, simple display -->
    <p class="text-sm text-[#6B7280] py-4" data-testid="single-version-msg">Only one version exists.</p>

  {:else}
    <!-- Vertical rail -->
    <ol class="relative border-l border-[#ECE8E1] ml-3 space-y-4" aria-label="Version history">
      {#each sortedVersions as entry, idx (entry.version)}
        {@const isExpanded = expandedVersions.has(entry.version)}
        {@const changedFields = entry.diff_summary
          ? null  // server-provided diff_summary takes priority
          : computeDiff(idx)}
        {@const hasDiff = idx < sortedVersions.length - 1}

        <li
          class="ml-4"
          data-testid="timeline-entry"
          data-version={entry.version}
        >
          <!-- Timeline dot -->
          <span class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-base-100 bg-primary" aria-hidden="true"></span>

          <!-- Entry header (keyboard accessible) -->
          <div
            role="button"
            tabindex="0"
            class="flex items-start justify-between gap-2 cursor-pointer select-none rounded-lg px-2 py-1 -mx-2 hover:bg-base-200 transition-colors"
            onclick={() => toggleExpand(entry.version)}
            onkeydown={(e) => handleKeydown(e, entry.version)}
            aria-expanded={isExpanded}
            aria-label="Version {entry.version}"
            data-testid="timeline-entry-header"
          >
            <div class="flex-1 min-w-0">
              <!-- v{n} · author · time-ago -->
              <p class="text-sm font-semibold text-base-content" data-testid="entry-label">
                v{entry.version} · <span class="font-normal text-[#6B7280]">{shortMember(entry.pushed_by_member_id)}</span> · <span class="font-normal text-[#6B7280]">{relative(entry.pushed_at)}</span>
              </p>

              <!-- Diff summary -->
              {#if hasDiff}
                {#if entry.diff_summary}
                  <!-- Server-provided diff summary -->
                  <p class="text-xs text-[#6B7280] mt-0.5" data-testid="diff-summary">
                    {entry.diff_summary}
                  </p>
                {:else if changedFields && changedFields.length > 0}
                  <!-- Client-computed diff (field names only — never values) -->
                  <p class="text-xs text-[#6B7280] mt-0.5" data-testid="diff-summary">
                    changed: {changedFields.join(', ')}
                  </p>
                {/if}
              {/if}
            </div>

            <!-- Status badge -->
            <span class="text-xs rounded-full px-2 py-0.5 bg-base-200 text-[#6B7280] flex-shrink-0">
              {entry.status}
            </span>

            <!-- Expand indicator -->
            {#if entry.payload}
              <span class="text-xs text-[#6B7280] flex-shrink-0" aria-hidden="true">
                {isExpanded ? '▲' : '▼'}
              </span>
            {/if}
          </div>

          <!-- Expanded payload -->
          {#if isExpanded && entry.payload}
            <div class="mt-2 pl-2" data-testid="expanded-payload">
              <PayloadViewer payload={entry.payload} />
            </div>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</div>

<script lang="ts">
  /**
   * PayloadViewer — STORY-006-06
   *
   * Renders an item payload as formatted JSON.
   * - String fields longer than 240 chars are truncated with "Show more".
   * - Keys matching the redaction list are rendered as "•••••" (defense-in-depth).
   *   The server (STORY-003-03) should already strip them; UI double-gates.
   * - Svelte 5 runes only.
   *
   * Design Guide §6.1 table + monospace code block patterns.
   */

  const REDACTED_KEYS = /^(password|secret|token|api_key)$/i;
  const TRUNCATE_CHARS = 240;

  interface Props {
    payload: Record<string, unknown>;
  }

  let { payload }: Props = $props();

  interface BaseField {
    key: string;
    raw: string;
    truncated: boolean;
    redacted: boolean;
  }

  interface Field extends BaseField {
    expanded: boolean;
  }

  function buildBaseFields(p: Record<string, unknown>): BaseField[] {
    return Object.entries(p).map(([key, val]) => {
      const redacted = REDACTED_KEYS.test(key);
      const raw = redacted ? '•••••' : JSON.stringify(val, null, 2);
      const truncated = !redacted && raw.length > TRUNCATE_CHARS;
      return { key, raw, truncated, redacted };
    });
  }

  // Base fields derived from payload — re-runs when payload prop changes (Svelte 5 $derived tracks prop access)
  const baseFields = $derived(buildBaseFields(payload));

  // Expanded state tracked per field index
  let expandedSet = $state<Set<number>>(new Set());

  // Merge base fields with expanded state
  const fields = $derived<Field[]>(
    baseFields.map((f, idx) => ({ ...f, expanded: expandedSet.has(idx) })),
  );

  function toggle(idx: number) {
    const next = new Set(expandedSet);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    expandedSet = next;
  }
</script>

<!--
  PayloadViewer — monospace JSON renderer with redaction + collapsible long fields
  Design Guide §6.1 code block pattern
-->
<div class="space-y-2 font-mono text-sm" data-testid="payload-viewer">
  {#each fields as field, idx (field.key)}
    <div class="bg-base-200 rounded-lg px-3 py-2">
      <!-- Key -->
      <span class="text-primary font-semibold">{field.key}</span>
      <span class="text-[#6B7280]">: </span>

      {#if field.redacted}
        <!-- Redacted value -->
        <span class="text-error" data-testid="redacted-value">•••••</span>
      {:else if field.truncated && !field.expanded}
        <!-- Truncated value with show-more -->
        <span class="text-base-content whitespace-pre-wrap break-all">
          {field.raw.slice(0, TRUNCATE_CHARS)}<span class="text-[#9CA3AF]">…</span>
        </span>
        <button
          type="button"
          class="ml-2 text-xs text-primary underline hover:no-underline"
          onclick={() => toggle(idx)}
          data-testid="show-more-btn"
        >
          Show more
        </button>
      {:else if field.truncated && field.expanded}
        <!-- Expanded full value -->
        <span class="text-base-content whitespace-pre-wrap break-all">{field.raw}</span>
        <button
          type="button"
          class="ml-2 text-xs text-primary underline hover:no-underline"
          onclick={() => toggle(idx)}
          data-testid="show-less-btn"
        >
          Show less
        </button>
      {:else}
        <!-- Short value — show fully -->
        <span class="text-base-content whitespace-pre-wrap break-all">{field.raw}</span>
      {/if}
    </div>
  {/each}
</div>

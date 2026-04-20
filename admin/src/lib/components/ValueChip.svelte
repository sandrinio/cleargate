<script lang="ts">
  /**
   * ValueChip — STORY-006-08
   *
   * Design Guide §6.3 stat chip:
   *   rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1
   *
   * Props:
   *   label — descriptive label shown below the value
   *   value — the primary stat value (string for flexibility)
   *   hint  — optional secondary text
   */

  interface Props {
    label: string;
    value: string;
    hint?: string;
  }

  let { label, value, hint }: Props = $props();
</script>

<!--
  Design Guide §6.3 ValueChip:
  rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1 tabular-nums
-->
<div class="flex flex-col items-center gap-1">
  <span
    class="rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1 tabular-nums"
    data-testid="value-chip-value"
  >
    {value}
  </span>
  <span class="text-xs text-base-content/60 font-medium" data-testid="value-chip-label">
    {label}
  </span>
  {#if hint}
    <span class="text-xs text-base-content/40" data-testid="value-chip-hint">
      {hint}
    </span>
  {/if}
</div>

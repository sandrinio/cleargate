<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    headline: string;
    supporting?: string;
    ctaLabel?: string;
    ctaHref?: string;
    onctaclick?: () => void;
    icon?: Snippet;
  }

  let { headline, supporting, ctaLabel, ctaHref, onctaclick, icon }: Props = $props();
</script>

<!--
  Design Guide §6.9 Empty states
  Icon (48px, text-subtle), headline, supporting line, CTA button
  Copy is actionable per EPIC-006 Q6
-->
<div class="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
  <!-- Icon slot (48px, text-subtle) -->
  <div class="w-12 h-12 flex items-center justify-center text-[#9CA3AF]">
    {#if icon}
      {@render icon()}
    {/if}
  </div>

  <!-- Headline -->
  <h2 class="text-xl font-semibold text-base-content">{headline}</h2>

  <!-- Supporting text -->
  {#if supporting}
    <p class="text-sm text-[#6B7280] max-w-xs">{supporting}</p>
  {/if}

  <!-- CTA button -->
  {#if ctaLabel}
    {#if ctaHref}
      <a href={ctaHref} class="btn btn-primary rounded-full mt-2">{ctaLabel}</a>
    {:else}
      <button type="button" class="btn btn-primary rounded-full mt-2" onclick={onctaclick}>
        {ctaLabel}
      </button>
    {/if}
  {/if}
</div>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    onclose?: () => void;
    children?: Snippet;
    title?: string;
  }

  let { open = false, onclose, children, title }: Props = $props();

  function handleBackdropClick() {
    onclose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onclose?.();
    }
  }
</script>

<!--
  Design Guide §6.8 Modals (shell only — STORY-006-05 extends)
  Backdrop: bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm
  Panel: rounded-2xl bg-base-100 shadow-card p-8 max-w-lg
-->
{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label={title ?? 'Dialog'}
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm"
      onclick={handleBackdropClick}
      onkeydown={handleKeydown}
      role="button"
      tabindex="-1"
      aria-label="Close dialog"
    ></div>

    <!-- Panel -->
    <div class="relative rounded-2xl bg-base-100 shadow-card p-8 max-w-lg w-full z-10">
      {#if title}
        <h2 class="text-xl font-semibold text-base-content mb-4">{title}</h2>
      {/if}

      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}

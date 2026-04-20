<script lang="ts">
  import { toastStore, type Toast } from '$lib/stores/toast';
  import { X } from 'lucide-svelte';

  const borderColorMap: Record<Toast['variant'], string> = {
    info: 'border-l-info',
    success: 'border-l-success',
    warning: 'border-l-warning',
    error: 'border-l-error',
  };
</script>

<!--
  Design Guide §6.10 Toast / notifications
  Bottom-right, 320px wide, rounded-2xl shadow-card p-4
  Colored left border (4px) matching semantic token
-->
<div
  class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[320px]"
  aria-live="polite"
  aria-label="Notifications"
>
  {#each toastStore.toasts as toast (toast.id)}
    <div
      class="bg-base-100 rounded-2xl shadow-card p-4 border-l-4 flex items-start gap-3 {borderColorMap[
        toast.variant
      ]}"
      role="alert"
    >
      <p class="flex-1 text-sm text-base-content">{toast.message}</p>
      {#if toast.persistent}
        <button
          type="button"
          class="flex-shrink-0 text-[#9CA3AF] hover:text-base-content transition-colors"
          aria-label="Dismiss notification"
          onclick={() => toastStore.remove(toast.id)}
        >
          <X size={16} />
        </button>
      {/if}
    </div>
  {/each}
</div>

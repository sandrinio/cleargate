<script lang="ts">
  /**
   * WindowSelector — STORY-006-08
   *
   * Segmented control for 7d / 30d / 90d window selection.
   * URL-synced via $app/navigation goto + $app/stores page.
   *
   * Design Guide §6.4 segmented control / pill-only pattern.
   */
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  type Window = '7d' | '30d' | '90d';

  const WINDOWS: Window[] = ['7d', '30d', '90d'];

  // Derive active window from URL searchParams; default 30d
  let activeWindow: Window = $derived(
    (() => {
      const raw = $page.url.searchParams.get('window');
      return (WINDOWS.includes(raw as Window) ? raw : '30d') as Window;
    })(),
  );

  async function select(w: Window): Promise<void> {
    const url = new URL($page.url);
    url.searchParams.set('window', w);
    await goto(url.toString(), { keepFocus: true, noScroll: true });
  }
</script>

<!--
  Design Guide §6.4 segmented control:
  Three pill buttons; active state uses btn-primary; inactive is btn-ghost
-->
<div class="flex gap-1 rounded-full bg-base-200 p-1" role="group" aria-label="Time window">
  {#each WINDOWS as w (w)}
    <button
      type="button"
      class="btn btn-sm rounded-full transition-colors {activeWindow === w
        ? 'btn-primary'
        : 'btn-ghost'}"
      aria-pressed={activeWindow === w}
      data-testid="window-btn-{w}"
      onclick={() => select(w)}
    >
      {w}
    </button>
  {/each}
</div>

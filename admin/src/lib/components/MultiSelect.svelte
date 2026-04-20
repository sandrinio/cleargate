<script lang="ts">
  /**
   * MultiSelect — checkbox dropdown — STORY-006-07
   *
   * Design Guide §6.5 styling.
   * Keyboard a11y: Space/Enter to toggle, Escape to close.
   *
   * Props:
   *   options: Array<{value: string, label: string}>
   *   selected: string[]  — currently selected values
   *   placeholder: string — shown when nothing is selected
   *   onchange: (selected: string[]) => void
   */

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    options: Option[];
    selected?: string[];
    placeholder?: string;
    label?: string;
    onchange?: (selected: string[]) => void;
  }

  let {
    options = [],
    selected = [],
    placeholder = 'All',
    label = 'Select',
    onchange,
  }: Props = $props();

  let open = $state(false);
  let containerEl = $state<HTMLDivElement | null>(null);

  const displayLabel = $derived(
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`
  );

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onchange?.(next);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  });
</script>

<!-- svelte:window needed for keyboard nav -->
<svelte:window onkeydown={handleKeydown} />

<div
  class="relative inline-block"
  bind:this={containerEl}
  data-testid="multiselect"
>
  <!-- Trigger button -->
  <button
    type="button"
    class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1] text-sm min-w-[120px] text-left justify-between"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    onclick={() => { open = !open; }}
    data-testid="multiselect-trigger"
  >
    <span class="truncate">{displayLabel}</span>
    <svg
      class="w-4 h-4 ml-2 flex-shrink-0 transition-transform {open ? 'rotate-180' : ''}"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <!-- Dropdown -->
  {#if open}
    <div
      class="absolute top-full left-0 mt-1 z-50 bg-base-100 border border-[#ECE8E1] rounded-2xl shadow-lg min-w-[180px] py-2"
      role="listbox"
      aria-multiselectable="true"
      data-testid="multiselect-dropdown"
    >
      {#if options.length === 0}
        <p class="px-4 py-2 text-sm text-[#6B7280]">No options</p>
      {:else}
        {#each options as option (option.value)}
          <button
            type="button"
            class="w-full flex items-center gap-3 px-4 py-2 text-sm text-base-content hover:bg-base-200 transition-colors"
            role="option"
            aria-selected={selected.includes(option.value)}
            onclick={() => toggle(option.value)}
            data-testid="multiselect-option-{option.value}"
          >
            <span
              class="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center
                {selected.includes(option.value)
                  ? 'bg-primary border-primary'
                  : 'border-[#D1D5DB]'}"
              aria-hidden="true"
            >
              {#if selected.includes(option.value)}
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              {/if}
            </span>
            {option.label}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

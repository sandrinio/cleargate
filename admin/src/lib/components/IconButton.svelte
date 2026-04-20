<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    'aria-label': string;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }

  let {
    'aria-label': ariaLabel,
    onclick,
    children,
    type = 'button',
    disabled = false,
  }: Props = $props();
</script>

<!--
  Design Guide §6.4 Icon variant:
  btn btn-circle btn-ghost bg-base-200
  40px hit area, mandatory aria-label
-->
<button
  {type}
  {disabled}
  aria-label={ariaLabel}
  class="btn btn-circle btn-ghost bg-base-200 w-10 h-10 min-h-0 flex items-center justify-center"
  {onclick}
>
  {#if children}
    {@render children()}
  {/if}
</button>

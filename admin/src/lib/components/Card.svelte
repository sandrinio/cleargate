<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    class?: string;
  }

  let { children, class: extraClass = '' }: Props = $props();
</script>

<!--
  Design Guide §6.1 Card:
  bg-base-100 rounded-3xl shadow-card p-6
-->
<div class="bg-base-100 rounded-3xl shadow-card p-6 {extraClass}">
  {#if children}
    {@render children()}
  {/if}
</div>

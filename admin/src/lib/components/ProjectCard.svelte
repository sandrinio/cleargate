<script lang="ts">
  /**
   * ProjectCard — STORY-006-03
   *
   * Renders a single project as a Design Guide §6.1 card with:
   * - Project name linked to /projects/:id (text-xl font-semibold)
   * - Created-at relative time neutral pill (DG §6.2)
   *
   * M3 blueprint note: server does NOT return member_count or token_count
   * in GET /projects. Those chips will be added when STORY-006-08 adds
   * stats aggregation. Props reserved for forward-compat.
   */
  import type { Project } from 'cleargate/admin-api';
  import Card from './Card.svelte';
  import { relative } from '../utils/time-ago.js';

  interface Props {
    project: Project;
    /** Member count — pass when available (N+1 fetched). Omit for N/A. */
    memberCount?: number;
    /** Token count — pass when available (N+1 fetched). Omit for N/A. */
    tokenCount?: number;
  }

  let { project, memberCount, tokenCount }: Props = $props();

  const createdAgo = $derived(relative(project.created_at));
</script>

<!--
  Design Guide §6.1: bg-base-100 rounded-3xl shadow-card p-6
  Design Guide §6.2: neutral pill for meta tag
  Design Guide §6.3: value chip for counts
-->
<Card>
  <div class="flex flex-col gap-3">
    <!-- Card header: name (link) + slug muted -->
    <div>
      <a
        href="/projects/{project.id}"
        class="text-xl font-semibold text-base-content hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary outline-offset-2"
      >
        {project.name}
      </a>
    </div>

    <!-- Chips row -->
    <div class="flex flex-wrap gap-2 items-center">
      <!-- Created pill (DG §6.2 neutral tag) -->
      <span
        class="rounded-full bg-base-200 text-[#4B5363] text-xs px-3 py-1"
        aria-label="Created {createdAgo}"
      >
        Created {createdAgo}
      </span>

      <!-- Member count chip (DG §6.3 value chip) — only if provided -->
      {#if memberCount !== undefined}
        <span
          class="rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1"
          aria-label="{memberCount} {memberCount === 1 ? 'member' : 'members'}"
        >
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      {/if}

      <!-- Token count chip (DG §6.3 value chip) — only if provided -->
      {#if tokenCount !== undefined}
        <span
          class="rounded-full bg-accent text-accent-content text-sm font-semibold px-3 py-1"
          aria-label="{tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}"
        >
          {tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}
        </span>
      {/if}
    </div>
  </div>
</Card>

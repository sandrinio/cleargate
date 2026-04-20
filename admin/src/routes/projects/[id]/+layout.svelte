<script lang="ts">
  /**
   * /projects/[id] nested layout — STORY-006-04
   *
   * Client-side only (no +page.server.ts per M3 §2).
   * Fetches project detail in $effect; stores in context for children.
   * Renders tab nav: Overview · Members · Tokens (stub) · Items (stub) · Audit (stub) · Stats (stub)
   *
   * Design Guide §6.6 active tab treatment: bg-[#FBE4D9] text-primary pill.
   */
  import { page } from '$app/stores';
  import { setContext } from 'svelte';
  import { get as mcpGet } from '$lib/mcp-client.js';
  import { ProjectSchema } from 'cleargate/admin-api';

  let { children } = $props();

  const projectId = $derived($page.params.id);

  let projectName = $state<string>('');
  let projectCreatedAt = $state<string>('');
  let loadingProject = $state(true);

  // Expose project data to child pages via Svelte context
  const projectContext = {
    get name() { return projectName; },
    get createdAt() { return projectCreatedAt; },
    get loading() { return loadingProject; },
  };
  setContext('projectContext', projectContext);

  $effect(() => {
    const id = projectId;
    loadingProject = true;
    mcpGet(`/projects/${id}`, ProjectSchema)
      .then((proj) => {
        projectName = proj.name;
        projectCreatedAt = proj.created_at;
      })
      .catch(() => {
        // Non-fatal — child pages handle their own error states
      })
      .finally(() => {
        loadingProject = false;
      });
  });

  // Tab definitions — only Overview + Members are active in this commit (STORY-006-04)
  // Using $derived so tabs re-derive when projectId changes (per M3 §8 re-run on param change)
  const tabs = $derived([
    { label: 'Overview', href: `/projects/${projectId}`, exact: true },
    { label: 'Members', href: `/projects/${projectId}/members`, exact: false },
    { label: 'Tokens', href: `/projects/${projectId}/tokens`, exact: false },
    { label: 'Items', href: `/projects/${projectId}/items`, exact: false },
    { label: 'Audit', href: `/projects/${projectId}/audit`, exact: false },
    { label: 'Stats', href: `/projects/${projectId}/stats`, exact: false },
  ]);

  function isTabActive(tab: { href: string; exact: boolean }): boolean {
    const pathname = $page.url.pathname;
    if (tab.exact) return pathname === tab.href || pathname === tab.href + '/';
    return pathname.startsWith(tab.href);
  }
</script>

<!-- Project context header -->
<div class="mb-6">
  {#if loadingProject}
    <div class="h-8 w-48 bg-base-200 rounded-full animate-pulse mb-2"></div>
  {:else}
    <h1 class="text-3xl font-bold text-base-content">
      {projectName || 'Project'}
    </h1>
  {/if}

  <!-- Tab nav — Design Guide §6.6 active treatment -->
  <nav
    class="flex gap-1 mt-4 overflow-x-auto"
    aria-label="Project sections"
  >
    {#each tabs as tab}
      <a
        href={tab.href}
        class="px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
          {isTabActive(tab)
            ? 'bg-[#FBE4D9] text-primary'
            : 'text-[#6B7280] hover:bg-base-200 hover:text-base-content'}"
        aria-current={isTabActive(tab) ? 'page' : undefined}
      >
        {tab.label}
      </a>
    {/each}
  </nav>
</div>

<!-- Child page content -->
{@render children()}

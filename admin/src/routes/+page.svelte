<script lang="ts">
  /**
   * Dashboard — STORY-006-03
   *
   * Client-side fetching only (M3 architect override: no +page.server.ts).
   * mcp-client.ts is browser-only; all data calls happen in $effect after mount.
   *
   * Design Guide references:
   * - §6.1 Card shell (bg-base-100 rounded-3xl shadow-card p-6)
   * - §6.2 Neutral pill for created-at meta
   * - §6.4 Buttons (btn btn-primary rounded-full)
   * - §6.9 Empty states
   */
  import { onMount } from 'svelte';
  import { z } from 'zod';
  import { ProjectSchema } from 'cleargate/admin-api';
  import type { Project } from 'cleargate/admin-api';
  import * as mcpClient from '$lib/mcp-client.js';
  import { toastStore } from '$lib/stores/toast.svelte.js';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ProjectCard from '$lib/components/ProjectCard.svelte';
  import { FolderOpen } from 'lucide-svelte';

  // Inline list wrapper schema — no envelope schema exists in cleargate/admin-api
  const ProjectsWrapperSchema = z.object({ projects: z.array(ProjectSchema) }).strict();

  let loadState: 'loading' | 'loaded' | 'error' = $state('loading');
  let projects: Project[] = $state([]);

  async function loadProjects(): Promise<void> {
    loadState = 'loading';
    try {
      const res = await mcpClient.get('/projects', ProjectsWrapperSchema);
      // Sort alphabetically by name (server does not sort — M3 §6.1)
      projects = [...res.projects].sort((a, b) => a.name.localeCompare(b.name));
      loadState = 'loaded';
    } catch (err) {
      console.error('[dashboard] failed to load projects', err);
      toastStore.error('Failed to load projects');
      loadState = 'error';
    }
  }

  onMount(() => {
    loadProjects();
  });

  function retry() {
    loadProjects();
  }
</script>

<svelte:head>
  <title>Projects — ClearGate Admin</title>
</svelte:head>

<!-- Page header -->
<div class="flex items-center justify-between mb-6">
  <h1 class="text-3xl font-bold text-base-content">Projects</h1>
  <a href="/projects/new" class="btn btn-primary rounded-full">
    New project
  </a>
</div>

<!-- Loading skeleton (DG §6.1 skeleton pattern) -->
{#if loadState === 'loading'}
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading projects">
    {#each [1, 2, 3] as _}
      <div class="bg-base-200 rounded-3xl animate-pulse h-32" aria-hidden="true"></div>
    {/each}
  </div>

<!-- Error state -->
{:else if loadState === 'error'}
  <div class="bg-base-100 rounded-3xl shadow-card p-6 flex flex-col items-center gap-3 text-center">
    <p class="text-base text-base-content font-medium">Couldn't load projects</p>
    <button
      type="button"
      class="btn btn-ghost rounded-full"
      onclick={retry}
    >
      Retry
    </button>
  </div>

<!-- Loaded: empty state -->
{:else if loadState === 'loaded' && projects.length === 0}
  <EmptyState
    headline="No projects yet"
    supporting="Create your first project to start syncing items"
    ctaLabel="Create your first project →"
    ctaHref="/projects/new"
  >
    {#snippet icon()}
      <FolderOpen size={48} strokeWidth={1.75} aria-hidden="true" />
    {/snippet}
  </EmptyState>

<!-- Loaded: project grid -->
{:else if loadState === 'loaded'}
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
    {#each projects as project (project.id)}
      <ProjectCard {project} />
    {/each}
  </div>
{/if}

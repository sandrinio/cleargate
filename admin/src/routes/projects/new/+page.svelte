<script lang="ts">
  /**
   * Create project page — STORY-006-03
   *
   * Client-side form (M3 architect override: no form actions, no +page.server.ts).
   * Validation is client-side only; server accepts name 1-200 chars (no slug field).
   *
   * Design Guide references:
   * - §6.5 Inputs (rounded-xl bg-base-100 border border-line)
   * - §6.4 Buttons (btn btn-primary rounded-full)
   */
  import { goto } from '$app/navigation';
  import { z } from 'zod';
  import { ProjectSchema } from 'cleargate/admin-api';
  import * as mcpClient from '$lib/mcp-client.js';
  import { toastStore } from '$lib/stores/toast.js';

  // POST /projects returns a bare ProjectDto (no { project: ... } envelope)
  // Confirmed: mcp/src/admin-api/projects.ts:92-93 sends reply.code(201).send(toDto(project!))
  const NewProjectResponseSchema = ProjectSchema;

  // Client-side validation constants
  const NAME_MAX = 100;

  let name = $state('');
  let submitting = $state(false);

  // Inline validation error states
  let nameError = $state<string | null>(null);

  function validateName(value: string): string | null {
    if (!value.trim()) return 'Project name is required';
    if (value.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer`;
    return null;
  }

  function validate(): boolean {
    nameError = validateName(name);
    return nameError === null;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;

    submitting = true;
    try {
      const res = await mcpClient.post(
        '/projects',
        { name: name.trim() },
        NewProjectResponseSchema,
      );
      toastStore.success('Project created');
      await goto(`/projects/${res.id}`);
    } catch (err) {
      console.error('[new-project] create failed', err);
      toastStore.error('Failed to create project — please try again');
    } finally {
      submitting = false;
    }
  }

  function handleCancel() {
    goto('/');
  }
</script>

<svelte:head>
  <title>New Project — ClearGate Admin</title>
</svelte:head>

<div class="max-w-lg mx-auto">
  <!-- Breadcrumb -->
  <nav class="mb-6" aria-label="Breadcrumb">
    <ol class="flex items-center gap-2 text-sm text-[#6B7280]">
      <li><a href="/" class="hover:text-base-content transition-colors">Projects</a></li>
      <li aria-hidden="true">/</li>
      <li class="text-base-content font-medium" aria-current="page">New project</li>
    </ol>
  </nav>

  <h1 class="text-3xl font-bold text-base-content mb-6">New project</h1>

  <div class="bg-base-100 rounded-3xl shadow-card p-6">
    <form onsubmit={handleSubmit} novalidate>
      <!-- Name field -->
      <div class="flex flex-col gap-1 mb-5">
        <label for="project-name" class="text-sm font-medium text-base-content">
          Project name <span aria-hidden="true" class="text-[#C23A3A]">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          bind:value={name}
          placeholder="My project"
          required
          maxlength={NAME_MAX}
          aria-required="true"
          aria-describedby={nameError ? 'project-name-error' : undefined}
          aria-invalid={nameError ? 'true' : undefined}
          oninput={() => { if (nameError) nameError = validateName(name); }}
          class="rounded-xl bg-base-100 border px-4 py-2.5 text-sm focus:outline-none focus:ring-0 transition-colors
            {nameError
              ? 'border-[#C23A3A] focus:border-[#C23A3A]'
              : 'border-[#ECE8E1] focus:border-primary'}"
        />
        {#if nameError}
          <p id="project-name-error" class="text-xs text-[#C23A3A] mt-1" role="alert">
            {nameError}
          </p>
        {/if}
        <p class="text-xs text-[#9CA3AF]">{name.length}/{NAME_MAX} characters</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          class="btn btn-primary rounded-full"
          disabled={submitting}
          aria-disabled={submitting}
        >
          {#if submitting}
            Creating…
          {:else}
            Create project
          {/if}
        </button>
        <button
          type="button"
          class="btn btn-ghost rounded-full"
          onclick={handleCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>

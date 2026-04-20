<script lang="ts">
  /**
   * AddAdminModal — STORY-006-09
   *
   * Form modal to add a new admin user by GitHub handle.
   * Client-side validation: handle must match /^[a-zA-Z0-9-]{1,39}$/
   *
   * Props:
   *   open: boolean
   *   onclose: () => void
   *   onadd: (github_handle: string, is_root: boolean) => Promise<void>
   */
  import Modal from './Modal.svelte';

  const GH_HANDLE_RE = /^[a-zA-Z0-9-]{1,39}$/;

  interface Props {
    open: boolean;
    onclose: () => void;
    onadd: (github_handle: string, is_root: boolean) => Promise<void>;
  }

  let { open, onclose, onadd }: Props = $props();

  let handle = $state('');
  let isRoot = $state(false);
  let handleError = $state('');
  let submitting = $state(false);
  let serverError = $state('');

  function validateHandle(value: string): string {
    if (!value) return 'GitHub handle is required';
    if (!GH_HANDLE_RE.test(value)) return 'Invalid GitHub handle (letters, numbers, hyphens, 1–39 chars)';
    return '';
  }

  function handleInput() {
    handleError = validateHandle(handle);
    serverError = '';
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    handleError = validateHandle(handle);
    if (handleError) return;

    submitting = true;
    serverError = '';
    try {
      await onadd(handle.trim(), isRoot);
      // Reset on success
      handle = '';
      isRoot = false;
      handleError = '';
    } catch (err: unknown) {
      const e = err as { message?: string };
      serverError = e.message ?? 'Failed to add admin';
    } finally {
      submitting = false;
    }
  }

  function handleClose() {
    handle = '';
    isRoot = false;
    handleError = '';
    serverError = '';
    onclose();
  }
</script>

<Modal open={open} onclose={handleClose} title="Add admin">
  <form onsubmit={handleSubmit} novalidate>
    <!-- GitHub handle input -->
    <div class="mb-4">
      <label for="github-handle" class="block text-sm font-medium text-base-content mb-1">
        GitHub handle
      </label>
      <input
        id="github-handle"
        type="text"
        class="input input-bordered w-full rounded-xl
          {handleError ? 'input-error' : ''}"
        placeholder="e.g. octocat"
        bind:value={handle}
        oninput={handleInput}
        disabled={submitting}
        autocomplete="off"
        data-testid="handle-input"
      />
      {#if handleError}
        <p class="text-xs text-error mt-1" role="alert" data-testid="handle-error">
          {handleError}
        </p>
      {/if}
    </div>

    <!-- is_root checkbox -->
    <div class="mb-6 flex items-center gap-3">
      <input
        id="is-root"
        type="checkbox"
        class="checkbox checkbox-primary"
        bind:checked={isRoot}
        disabled={submitting}
        data-testid="is-root-checkbox"
      />
      <label for="is-root" class="text-sm text-base-content cursor-pointer">
        Grant root privileges
      </label>
    </div>

    <!-- Server error -->
    {#if serverError}
      <p class="text-sm text-error mb-4" role="alert" data-testid="server-error">
        {serverError}
      </p>
    {/if}

    <!-- Action row -->
    <div class="flex justify-end gap-3">
      <button
        type="button"
        class="btn btn-ghost rounded-full"
        onclick={handleClose}
        disabled={submitting}
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn btn-primary rounded-full"
        disabled={submitting || !!handleError}
        data-testid="submit-btn"
      >
        {#if submitting}
          <span class="loading loading-spinner loading-sm"></span>
        {:else}
          Add admin
        {/if}
      </button>
    </div>
  </form>
</Modal>

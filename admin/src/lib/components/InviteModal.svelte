<script lang="ts">
  /**
   * InviteModal — Two-phase invite flow (form → URL display)
   * Design Guide §6.4 modals, §6.8 chip, §6.7 action buttons
   *
   * Phase 1 (form): email + role select → POST /projects/:id/members
   * Phase 2 (url):  show invite_url in select-all chip + Copy button
   *
   * NO "Resend invite" button — orchestrator decision (MCP returns 409).
   */
  import Modal from './Modal.svelte';
  import IconButton from './IconButton.svelte';
  import { toastStore } from '$lib/stores/toast.svelte.js';
  import { post } from '$lib/mcp-client.js';
  import { InviteCreatedSchema } from 'cleargate/admin-api';

  interface Props {
    open: boolean;
    onclose: () => void;
    /** Project ID used for the POST path */
    projectId: string;
    /** Project name shown in the modal title */
    projectName?: string;
    /** Called after a successful invite so parent can refetch members */
    onmemberinvited?: () => void;
  }

  let {
    open,
    onclose,
    projectId,
    projectName = 'this project',
    onmemberinvited,
  }: Props = $props();

  type Phase = 'form' | 'url';
  let phase = $state<Phase>('form');
  let email = $state('');
  let role = $state<'user' | 'service'>('user');
  let submitting = $state(false);
  let errorMsg = $state('');
  let inviteUrl = $state('');

  // Reset internal state when modal reopens
  $effect(() => {
    if (open) {
      phase = 'form';
      email = '';
      role = 'user';
      submitting = false;
      errorMsg = '';
      inviteUrl = '';
    }
  });

  const emailValid = $derived(
    email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!emailValid || submitting) return;

    submitting = true;
    errorMsg = '';

    try {
      const result = await post(
        `/projects/${projectId}/members`,
        { email, role },
        InviteCreatedSchema
      );
      inviteUrl = result.invite_url;
      phase = 'url';
      onmemberinvited?.();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        errorMsg = 'Already a member of this project';
      } else {
        errorMsg = 'Failed to send invite. Please try again.';
      }
    } finally {
      submitting = false;
    }
  }

  async function handleCopy() {
    try {
      // Primary path: Clipboard API (HTTPS/localhost only)
      await navigator.clipboard.writeText(inviteUrl);
      toastStore.success('Copied to clipboard');
    } catch {
      // Fallback: show readonly input — already visible as select-all chip
      toastStore.info('Select the URL above and copy manually');
    }
  }

  function handleClose() {
    onclose();
  }
</script>

<!--
  Design Guide §6.4 modals
  Phase 1: form. Phase 2: URL chip + Copy.
-->
<Modal {open} onclose={handleClose} title={phase === 'form' ? 'Invite member' : 'Invite created'}>
  {#if phase === 'form'}
    <form onsubmit={handleSubmit} novalidate>
      <!-- Email field -->
      <div class="mb-4">
        <label for="invite-email" class="block text-sm font-medium text-base-content mb-1">
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          bind:value={email}
          placeholder="alice@example.com"
          required
          autocomplete="email"
          class="input input-bordered w-full rounded-xl text-sm"
          aria-describedby={errorMsg ? 'invite-error' : undefined}
        />
      </div>

      <!-- Role select -->
      <div class="mb-6">
        <label for="invite-role" class="block text-sm font-medium text-base-content mb-1">
          Role
        </label>
        <select
          id="invite-role"
          bind:value={role}
          class="select select-bordered w-full rounded-xl text-sm"
        >
          <option value="user">User</option>
          <option value="service">Service</option>
        </select>
      </div>

      <!-- Inline error -->
      {#if errorMsg}
        <p id="invite-error" class="text-sm text-error mb-4" role="alert">{errorMsg}</p>
      {/if}

      <!-- Action row — Design Guide §6.7 -->
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="btn btn-ghost rounded-full"
          onclick={handleClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary rounded-full"
          disabled={!emailValid || submitting}
          aria-disabled={!emailValid || submitting}
        >
          {submitting ? 'Sending…' : 'Send invite'}
        </button>
      </div>
    </form>
  {:else}
    <!-- URL phase — Design Guide §6.8 chip -->
    <p class="text-sm text-[#6B7280] mb-4">
      Share this link with the invitee. It expires and cannot be retrieved after closing.
    </p>

    <!-- Select-all chip with invite URL -->
    <!-- Use readonly input so user can manually copy in insecure contexts -->
    <div class="relative mb-4">
      <input
        type="text"
        readonly
        value={inviteUrl}
        class="bg-base-200 rounded-xl p-4 font-mono text-sm select-all w-full border-none focus:outline-none"
        aria-label="Invite URL"
        onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
      />
    </div>

    <!-- Copy button row -->
    <div class="flex items-center justify-between">
      <IconButton aria-label="Copy invite URL" onclick={handleCopy}>
        <!-- Clipboard SVG icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      </IconButton>

      <button
        type="button"
        class="btn btn-primary rounded-full"
        onclick={handleClose}
      >
        Done
      </button>
    </div>
  {/if}
</Modal>

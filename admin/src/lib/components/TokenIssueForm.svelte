<script lang="ts">
  /**
   * TokenIssueForm — Issue-token form modal — STORY-006-05
   *
   * Design Guide:
   *   §6.5 inputs: rounded-xl bg-base-100 border border-line focus:border-primary
   *   §6.4 buttons: btn btn-primary rounded-full (submit)
   *   §6.8 modals: panel rounded-2xl bg-base-100 shadow-card p-8 max-w-lg
   *
   * Props:
   *   open: boolean — controls visibility
   *   projectId: string
   *   memberOptions: Array<{ id: string; email: string }>
   *   onissued: (res: TokenIssued) => void — called with full response on success
   *   onclose: () => void
   *
   * POST /admin-api/v1/projects/:id/tokens
   *   Body: { member_id, name, expires_at? }
   *   Returns: TokenIssuedSchema (metadata + plaintext token field)
   *
   * If plaintext is absent from response, throws — NEVER falls back to empty/placeholder.
   *
   * Name validation: 3-80 chars client-side (server accepts 1-200).
   * Default expiry: 30d. "Never" sends expires_at = undefined.
   */
  import { post as mcpPost } from '$lib/mcp-client.js';
  import { toastStore } from '$lib/stores/toast.js';
  import { TokenIssuedSchema } from 'cleargate/admin-api';
  import type { TokenIssued } from 'cleargate/admin-api';

  interface MemberOption {
    id: string;
    email: string;
  }

  interface Props {
    open: boolean;
    projectId: string;
    memberOptions: MemberOption[];
    onissued: (res: TokenIssued) => void;
    onclose: () => void;
  }

  let { open, projectId, memberOptions, onissued, onclose }: Props = $props();

  type ExpiryOption = '7d' | '30d' | '90d' | 'never';

  let name = $state('');
  let selectedMemberId = $state('');
  let expiry: ExpiryOption = $state('30d');
  let submitting = $state(false);
  let nameError = $state('');
  let serverError = $state('');

  // When memberOptions changes and we have no selection, pick first
  $effect(() => {
    if (memberOptions.length > 0 && !selectedMemberId) {
      selectedMemberId = memberOptions[0]!.id;
    }
  });

  // Reset form state when modal opens
  $effect(() => {
    if (open) {
      name = '';
      expiry = '30d';
      nameError = '';
      serverError = '';
      submitting = false;
      if (memberOptions.length > 0) {
        selectedMemberId = memberOptions[0]!.id;
      } else {
        selectedMemberId = '';
      }
    }
  });

  function validateName(): boolean {
    if (name.length < 3) {
      nameError = '3-80 characters required';
      return false;
    }
    if (name.length > 80) {
      nameError = '3-80 characters required';
      return false;
    }
    nameError = '';
    return true;
  }

  function computeExpiresAt(): string | undefined {
    const days = expiry === '7d' ? 7 : expiry === '30d' ? 30 : expiry === '90d' ? 90 : null;
    if (days === null) return undefined; // "never" → omit
    return new Date(Date.now() + days * 86400e3).toISOString();
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validateName()) return;
    if (!selectedMemberId) {
      serverError = 'Please select a member.';
      return;
    }

    submitting = true;
    serverError = '';

    try {
      const body: { member_id: string; name: string; expires_at?: string } = {
        member_id: selectedMemberId,
        name,
      };
      const expiresAt = computeExpiresAt();
      if (expiresAt !== undefined) {
        body.expires_at = expiresAt;
      }

      const result = await mcpPost(
        `/projects/${projectId}/tokens`,
        body,
        TokenIssuedSchema,
      );

      // Security: verify plaintext is present — NEVER fall back to empty/placeholder
      if (!result.token) {
        throw new Error('Schema drift: plaintext token missing from server response');
      }

      onissued(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to issue token. Please try again.';
      serverError = msg;
      toastStore.error(serverError);
    } finally {
      submitting = false;
    }
  }

  function handleBackdropClick() {
    if (!submitting) onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !submitting) onclose();
  }
</script>

{#if open}
  <!-- Backdrop — Design Guide §6.8 -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Issue token"
  >
    <div
      class="absolute inset-0 bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm"
      onclick={handleBackdropClick}
      onkeydown={handleKeydown}
      role="button"
      tabindex="-1"
      aria-label="Close"
    ></div>

    <!-- Panel — DG §6.8: rounded-2xl bg-base-100 shadow-card p-8 max-w-lg -->
    <div class="relative rounded-2xl bg-base-100 shadow-card p-8 max-w-lg w-full z-10">
      <h2 class="text-xl font-semibold text-base-content mb-6">Issue token</h2>

      <form onsubmit={handleSubmit} novalidate>
        <!-- Token name — DG §6.5 inputs -->
        <div class="mb-4">
          <label for="token-name" class="block text-sm font-medium text-base-content mb-1">
            Token name <span class="text-error" aria-hidden="true">*</span>
          </label>
          <input
            id="token-name"
            type="text"
            class="w-full rounded-xl bg-base-100 border border-[#ECE8E1] focus:border-[#E85C2F] focus:ring-0 px-4 py-2.5 text-sm"
            placeholder="e.g. ci-bot"
            bind:value={name}
            oninput={() => { if (nameError) validateName(); }}
            aria-describedby={nameError ? 'token-name-error' : undefined}
            required
            minlength={3}
            maxlength={80}
            disabled={submitting}
          />
          {#if nameError}
            <p id="token-name-error" class="mt-1 text-xs text-error" role="alert">{nameError}</p>
          {/if}
        </div>

        <!-- Member select -->
        <div class="mb-4">
          <label for="token-member" class="block text-sm font-medium text-base-content mb-1">
            Member <span class="text-error" aria-hidden="true">*</span>
          </label>
          {#if memberOptions.length === 0}
            <p class="text-sm text-[#6B7280]">No members available. Invite a member first.</p>
          {:else}
            <select
              id="token-member"
              class="w-full rounded-xl bg-base-100 border border-[#ECE8E1] focus:border-[#E85C2F] focus:ring-0 px-4 py-2.5 text-sm"
              bind:value={selectedMemberId}
              disabled={submitting}
            >
              {#each memberOptions as m (m.id)}
                <option value={m.id}>{m.email}</option>
              {/each}
            </select>
          {/if}
        </div>

        <!-- Expiry radio -->
        <div class="mb-6">
          <fieldset>
            <legend class="block text-sm font-medium text-base-content mb-2">Expiry</legend>
            <div class="flex flex-wrap gap-3">
              {#each (['7d', '30d', '90d', 'never'] as ExpiryOption[]) as opt}
                <label class="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="expiry"
                    value={opt}
                    bind:group={expiry}
                    disabled={submitting}
                    class="radio radio-sm radio-primary"
                  />
                  {opt === '7d' ? '7 days' : opt === '30d' ? '30 days (default)' : opt === '90d' ? '90 days' : 'Never'}
                </label>
              {/each}
            </div>
          </fieldset>
        </div>

        <!-- Server error banner -->
        {#if serverError}
          <div class="mb-4 bg-error/10 rounded-xl p-3 text-sm text-error" role="alert">
            {serverError}
            <button
              type="button"
              class="underline ml-2"
              onclick={() => { serverError = ''; }}
            >Dismiss</button>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="btn btn-ghost rounded-full"
            onclick={onclose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary rounded-full"
            disabled={submitting || memberOptions.length === 0}
          >
            {submitting ? 'Issuing…' : 'Issue token'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

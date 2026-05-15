<script lang="ts">
  /**
   * InviteUrlModal — CR-062
   *
   * Single modal for both create-invite and resend-invite flows.
   * Shows the invite URL with a copy button and a mail-sent indicator.
   *
   * Design Guide:
   *   §6.8 modals: Modal.svelte shell
   *   Mail-sent indicator:
   *     green pill (badge-success) when mailSent === true: "Email sent to <email>"
   *     amber pill (badge-warning) when mailSent === false: "Email could not be sent — copy the URL manually"
   *
   * Props:
   *   open          — controls visibility
   *   inviteUrl     — the invite URL to display
   *   expiresAt     — ISO expiry string (display only)
   *   recipientEmail — shown in the mail-sent indicator
   *   mailSent      — whether the email was sent successfully
   *   onclose       — called when user closes the modal
   */
  import Modal from './Modal.svelte';
  import { copyToClipboard } from '$lib/utils/clipboard.js';
  import { toastStore } from '$lib/stores/toast.svelte.js';

  interface Props {
    open: boolean;
    inviteUrl: string;
    expiresAt: string;
    recipientEmail: string;
    mailSent: boolean;
    onclose?: () => void;
  }

  let { open, inviteUrl, expiresAt, recipientEmail, mailSent, onclose }: Props = $props();

  async function handleCopy() {
    try {
      const ok = await copyToClipboard(inviteUrl);
      if (ok) {
        toastStore.success('Copied to clipboard');
      } else {
        toastStore.info('Select the URL above and copy manually');
      }
    } catch {
      toastStore.info('Select the URL above and copy manually');
    }
  }

  function formatExpiry(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
</script>

<Modal {open} onclose={() => onclose?.()} title="Invite link">
  <!-- Mail-sent indicator -->
  {#if mailSent}
    <div class="badge badge-success text-success-content text-sm px-3 py-4 mb-4 w-full justify-start rounded-xl">
      Email sent to {recipientEmail}
    </div>
  {:else}
    <div class="badge badge-warning text-warning-content text-sm px-3 py-4 mb-4 w-full justify-start rounded-xl">
      Email could not be sent — copy the URL manually
    </div>
  {/if}

  <!-- Invite URL chip -->
  <p class="text-sm text-[#6B7280] mb-2">Share this link with the invitee:</p>
  <div class="relative mb-4">
    <div
      class="bg-base-200 rounded-xl p-4 font-mono text-sm break-all w-full"
      aria-label="Invite URL"
      role="textbox"
      aria-readonly="true"
    >{inviteUrl}</div>
  </div>

  <!-- Expiry note -->
  <p class="text-xs text-[#6B7280] mb-4">Expires: {formatExpiry(expiresAt)}</p>

  <!-- Actions -->
  <div class="flex items-center justify-between">
    <button
      type="button"
      class="btn btn-ghost btn-sm rounded-full"
      onclick={handleCopy}
      aria-label="Copy invite URL"
    >
      Copy URL
    </button>

    <button
      type="button"
      class="btn btn-primary rounded-full"
      onclick={() => onclose?.()}
    >
      Close
    </button>
  </div>
</Modal>

<script lang="ts">
  /**
   * TokenIssuedModal — One-time plaintext display modal — STORY-006-05 (LOAD-BEARING)
   *
   * Security contract (non-negotiable):
   *   - Plaintext lives ONLY in this component's local state.
   *   - NEVER written to localStorage, sessionStorage, IndexedDB, or any store.
   *   - NEVER emitted in console.log/warn/info/debug/error.
   *   - NEVER in toast text or DOM outside this modal's scope.
   *   - Zeroed on close before onclose() is called.
   *
   * Design Guide:
   *   §6.8 modals: bespoke <dialog>-free overlay (NOT M2 Modal.svelte — Esc must be
   *   disabled and backdrop-click must be disabled until checkbox is ticked)
   *   Backdrop: bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm
   *   Panel: rounded-2xl bg-base-100 shadow-card p-8 max-w-lg
   *   Plaintext chip: bg-base-200 rounded-xl p-4 font-mono text-sm select-all
   *   Copy: IconButton aria-label="Copy token"
   *   Checkbox: "I've saved it somewhere safe." gating Close button
   *
   * Props:
   *   open: boolean
   *   plaintext: string — the one-time token value
   *   onclose: () => void
   *
   * beforeunload: handler attached on open, detached on close or when checkbox is checked.
   * Esc: explicitly blocked (keyboard trap required by security contract).
   * Backdrop click: disabled.
   * SvelteKit beforeNavigate: zeros plaintext + calls onclose if navigating away.
   */
  import { onDestroy } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import { copyToClipboard } from '$lib/utils/clipboard.js';
  import { toastStore } from '$lib/stores/toast.js';

  interface Props {
    open: boolean;
    plaintext: string;
    onclose: () => void;
  }

  let { open, plaintext, onclose }: Props = $props();

  // Local security-sensitive state
  let saved = $state(false);
  let copying = $state(false);
  // Internal mutable copy; zeroed on close so the prop reference is also cleared
  let _plaintext = $state('');

  // Shake animation state for checkbox when close is attempted without ticking
  let shakeCheckbox = $state(false);

  // beforeunload handler — prevents accidental navigation while plaintext is exposed
  function beforeUnloadHandler(e: BeforeUnloadEvent) {
    if (!saved) {
      e.preventDefault();
      e.returnValue = 'You have an unsaved token. Leave anyway?';
    }
  }

  let handlerAttached = false;

  function attachBeforeUnload() {
    if (!handlerAttached && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', beforeUnloadHandler);
      handlerAttached = true;
    }
  }

  function detachBeforeUnload() {
    if (handlerAttached && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      handlerAttached = false;
    }
  }

  // Sync internal plaintext and attach/detach handler when open changes
  $effect(() => {
    if (open) {
      _plaintext = plaintext;
      saved = false;
      shakeCheckbox = false;
      attachBeforeUnload();
    } else {
      detachBeforeUnload();
    }
  });

  // When checkbox is checked, remove the beforeunload guard immediately
  $effect(() => {
    if (saved) {
      detachBeforeUnload();
    }
  });

  // SvelteKit navigation guard — zero plaintext and close if navigating away
  beforeNavigate(({ cancel }) => {
    if (open && !saved) {
      // Zero plaintext immediately before navigation
      _plaintext = '';
      detachBeforeUnload();
      onclose();
      // Allow navigation to proceed (modal will be gone)
    } else if (open && saved) {
      _plaintext = '';
      detachBeforeUnload();
      onclose();
    }
  });

  // Cleanup on component destroy (memory leak prevention)
  onDestroy(() => {
    detachBeforeUnload();
    _plaintext = '';
  });

  // Block Esc key — required by security contract
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (!saved) triggerShake();
    }
  }

  function triggerShake() {
    shakeCheckbox = false;
    // Use a microtask to re-trigger the animation class
    setTimeout(() => {
      shakeCheckbox = true;
      setTimeout(() => {
        shakeCheckbox = false;
      }, 500);
    }, 0);
  }

  function handleCloseClick() {
    if (!saved) {
      triggerShake();
      return;
    }
    // Zero plaintext before calling onclose
    _plaintext = '';
    detachBeforeUnload();
    onclose();
  }

  async function handleCopy() {
    if (copying) return;
    copying = true;
    try {
      const ok = await copyToClipboard(_plaintext);
      if (ok) {
        // Toast MUST NOT contain the token value — Design Guide §6.10
        toastStore.success('Copied to clipboard');
      } else {
        toastStore.error('Copy failed. Please select and copy the token manually.');
      }
    } finally {
      copying = false;
    }
  }
</script>

<!-- Global keydown capture to block Esc -->
<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!--
    Bespoke overlay — NOT built on Modal.svelte.
    Reason: M2 Modal's onclose fires on Esc + backdrop click;
    this modal must disable both until checkbox is ticked.
    Design Guide §6.8: backdrop bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm
  -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="token-modal-title"
    aria-describedby="token-modal-desc"
  >
    <!-- Non-interactive backdrop (no click-to-close) -->
    <div class="absolute inset-0 bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm"></div>

    <!-- Panel — DG §6.8: rounded-2xl bg-base-100 shadow-card p-8 max-w-lg -->
    <div class="relative rounded-2xl bg-base-100 shadow-card p-8 max-w-lg w-full z-10">
      <!-- Headline -->
      <h2 id="token-modal-title" class="text-xl font-semibold text-base-content mb-2">
        Copy this token now.
      </h2>
      <p id="token-modal-desc" class="text-sm text-[#6B7280] mb-4">
        This is the only time you'll see it. Store it in a password manager or CI secret immediately.
      </p>

      <!-- Warning callout -->
      <div class="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-4 flex items-start gap-2">
        <span class="text-warning font-bold text-sm shrink-0" aria-hidden="true">⚠</span>
        <p class="text-sm text-base-content font-medium">
          This is the only time you'll see this token. Save it now.
        </p>
      </div>

      <!-- Plaintext chip — DG §6.8: bg-base-200 rounded-xl p-4 font-mono text-sm select-all -->
      <div class="mb-4">
        <div class="flex items-center gap-2">
          <div
            class="flex-1 bg-base-200 rounded-xl p-4 font-mono text-sm select-all break-all"
            aria-label="Token value"
            role="textbox"
            aria-readonly="true"
          >
            {_plaintext}
          </div>
          <!-- Copy button — DG §6.4 Icon button -->
          <button
            type="button"
            class="btn btn-circle btn-ghost bg-base-200 shrink-0"
            aria-label="Copy token"
            onclick={handleCopy}
            disabled={copying}
          >
            <!-- Clipboard icon (lucide-style inline SVG) -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Checkbox gate — required to enable Close -->
      <div class="mb-6">
        <label
          class="flex items-center gap-3 cursor-pointer select-none"
          class:animate-shake={shakeCheckbox}
        >
          <input
            type="checkbox"
            class="checkbox checkbox-primary"
            bind:checked={saved}
            aria-describedby="saved-hint"
          />
          <span class="text-sm text-base-content font-medium">
            I've saved it somewhere safe.
          </span>
        </label>
        <p id="saved-hint" class="sr-only">
          You must check this box to confirm you've saved the token before you can close this dialog.
        </p>
      </div>

      <!-- Close button — disabled until checkbox is checked -->
      <div class="flex justify-end">
        <button
          type="button"
          class="btn btn-primary rounded-full"
          disabled={!saved}
          onclick={handleCloseClick}
          aria-disabled={!saved}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }

  .animate-shake {
    animation: shake 0.4s ease-in-out;
  }
</style>

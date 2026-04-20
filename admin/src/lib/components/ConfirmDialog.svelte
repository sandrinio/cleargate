<script lang="ts">
  /**
   * ConfirmDialog — Generic confirmation modal built on M2 Modal.svelte
   * Design Guide §6.4 modals + §6.7 action buttons
   *
   * Props (contract for Dev C — do not rename):
   *   open: boolean
   *   onclose: () => void
   *   onconfirm: () => void
   *   title: string
   *   message: string
   *   confirmLabel?: string  (default: 'Confirm')
   *   confirmVariant?: 'default' | 'danger'  (default: 'default')
   */
  import Modal from './Modal.svelte';

  interface Props {
    /** Controls modal visibility */
    open: boolean;
    /** Called when user dismisses (Esc, backdrop, Cancel) */
    onclose: () => void;
    /** Called when user clicks the confirm button */
    onconfirm: () => void;
    /** Modal heading */
    title: string;
    /** Body copy — describe the destructive action */
    message: string;
    /** Confirm button label (default: 'Confirm') */
    confirmLabel?: string;
    /** 'danger' renders btn-error, 'default' renders btn-primary */
    confirmVariant?: 'default' | 'danger';
  }

  let {
    open,
    onclose,
    onconfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    confirmVariant = 'default',
  }: Props = $props();

  const confirmClass = $derived(
    confirmVariant === 'danger' ? 'btn btn-error rounded-full' : 'btn btn-primary rounded-full'
  );

  function handleConfirm() {
    onconfirm();
    onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  }
</script>

<!--
  Design Guide §6.4 modal pattern
  Wraps M2 Modal shell; adds Cancel + Confirm action row per §6.7
-->
<Modal {open} {onclose} {title}>
  <!-- Message body -->
  <p class="text-sm text-[#6B7280] mb-6">
    {message}
  </p>

  <!-- Action row — Design Guide §6.7 action buttons -->
  <div class="flex justify-end gap-3">
    <button
      type="button"
      class="btn btn-ghost rounded-full"
      onclick={onclose}
      onkeydown={(e) => e.key === 'Escape' && onclose()}
    >
      Cancel
    </button>
    <button
      type="button"
      class={confirmClass}
      onclick={handleConfirm}
      onkeydown={handleKeydown}
    >
      {confirmLabel}
    </button>
  </div>
</Modal>

<script lang="ts">
  /**
   * StatusPill — Design Guide §6.2 value chips
   *
   * Props (contract for Dev C — do not rename):
   *   status: 'pending' | 'active' | 'expired' | 'revoked'
   *   label?: string  — optional override text (defaults to capitalised status)
   *
   * Color mapping per DG §6.2:
   *   active   → bg-success   text-success-content
   *   pending  → bg-warning   text-warning-content
   *   expired  → bg-error     text-error-content
   *   revoked  → bg-neutral   text-neutral-content
   */

  interface Props {
    /** Member/token status — four variants per M3 §7 */
    status: 'pending' | 'active' | 'expired' | 'revoked';
    /** Optional label override; defaults to status with first letter uppercased */
    label?: string;
  }

  let { status, label }: Props = $props();

  const displayLabel = $derived(label ?? (status.charAt(0).toUpperCase() + status.slice(1)));

  const colorClass = $derived(
    status === 'active'
      ? 'bg-success text-success-content'
      : status === 'pending'
        ? 'bg-warning text-warning-content'
        : status === 'expired'
          ? 'bg-error text-error-content'
          : 'bg-neutral text-neutral-content'
  );
</script>

<!--
  Design Guide §6.2 value chips:
  rounded-full text-xs font-semibold px-2.5 py-0.5
-->
<span class="rounded-full text-xs font-semibold px-2.5 py-0.5 {colorClass}">
  {displayLabel}
</span>

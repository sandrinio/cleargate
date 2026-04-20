<script lang="ts">
  /**
   * DateRangePicker — STORY-006-07
   *
   * Two native <input type="date"> fields + quick-select preset buttons.
   * Presets: Today / Last 24h / Last 7d / Last 30d.
   *
   * Design Guide §6.5 input styling.
   *
   * Displays in browser local time (native date input handles TZ automatically).
   * Emits {from, to} as ISO-8601 UTC strings.
   *
   * Validates to >= from — shows inline error if violated.
   *
   * v1.1 note: no popover calendar; native date inputs only.
   */

  interface DateRange {
    from: string; // ISO-8601 UTC
    to: string;   // ISO-8601 UTC
  }

  interface Props {
    /** Current from value as ISO-8601 UTC (optional initial) */
    from?: string | null;
    /** Current to value as ISO-8601 UTC (optional initial) */
    to?: string | null;
    /** Called when range changes with valid (from <= to) range */
    onchange?: (range: DateRange) => void;
  }

  let { from = null, to = null, onchange }: Props = $props();

  // Convert UTC ISO → YYYY-MM-DD for <input type="date">
  function isoToDateInput(iso: string | null): string {
    if (!iso) return '';
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  // Convert YYYY-MM-DD local → start-of-day UTC ISO string
  function dateInputToIsoFrom(val: string): string {
    if (!val) return '';
    // Treat as local midnight, convert to UTC
    const d = new Date(val + 'T00:00:00');
    return d.toISOString();
  }

  // Convert YYYY-MM-DD local → end-of-day UTC ISO string (23:59:59.999)
  function dateInputToIsoTo(val: string): string {
    if (!val) return '';
    const d = new Date(val + 'T23:59:59.999');
    return d.toISOString();
  }

  let fromInput = $state(isoToDateInput(from));
  let toInput = $state(isoToDateInput(to));
  let validationError = $state<string | null>(null);

  function validate(f: string, t: string): boolean {
    if (!f || !t) { validationError = null; return true; }
    const fMs = new Date(f + 'T00:00:00').getTime();
    const tMs = new Date(t + 'T23:59:59.999').getTime();
    if (fMs > tMs) {
      validationError = '"From" must be before "To"';
      return false;
    }
    validationError = null;
    return true;
  }

  function emitChange(f: string, t: string) {
    if (!validate(f, t)) return;
    if (!f || !t) return;
    onchange?.({ from: dateInputToIsoFrom(f), to: dateInputToIsoTo(t) });
  }

  function handleFromChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    fromInput = val;
    emitChange(val, toInput);
  }

  function handleToChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    toInput = val;
    emitChange(fromInput, val);
  }

  // Preset helpers
  function applyPreset(fromMs: number, toMs: number) {
    const f = new Date(fromMs);
    const t = new Date(toMs);
    fromInput = f.toISOString().slice(0, 10);
    toInput = t.toISOString().slice(0, 10);
    validationError = null;
    onchange?.({ from: f.toISOString(), to: t.toISOString() });
  }

  function presetToday() {
    const now = Date.now();
    const startOfDay = new Date(new Date(now).toDateString()).getTime();
    applyPreset(startOfDay, now);
  }

  function presetLast24h() {
    const now = Date.now();
    applyPreset(now - 24 * 60 * 60 * 1000, now);
  }

  function presetLast7d() {
    const now = Date.now();
    applyPreset(now - 7 * 24 * 60 * 60 * 1000, now);
  }

  function presetLast30d() {
    const now = Date.now();
    applyPreset(now - 30 * 24 * 60 * 60 * 1000, now);
  }
</script>

<!--
  DateRangePicker — Design Guide §6.5 input styling
  Native date inputs only (v1.1 popover calendar planned)
-->
<div class="flex flex-col gap-3">
  <!-- Preset buttons -->
  <div class="flex flex-wrap gap-2" aria-label="Quick date range presets">
    <button
      type="button"
      class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1] text-xs"
      onclick={presetToday}
    >
      Today
    </button>
    <button
      type="button"
      class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1] text-xs"
      onclick={presetLast24h}
      data-testid="preset-24h"
    >
      Last 24h
    </button>
    <button
      type="button"
      class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1] text-xs"
      onclick={presetLast7d}
      data-testid="preset-7d"
    >
      Last 7d
    </button>
    <button
      type="button"
      class="btn btn-sm btn-ghost rounded-full border border-[#ECE8E1] text-xs"
      onclick={presetLast30d}
      data-testid="preset-30d"
    >
      Last 30d
    </button>
  </div>

  <!-- Date inputs -->
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex flex-col gap-1">
      <label for="drp-from" class="text-xs text-[#6B7280] font-medium">From</label>
      <input
        id="drp-from"
        type="date"
        class="input input-bordered input-sm rounded-full text-sm"
        value={fromInput}
        onchange={handleFromChange}
        data-testid="date-from"
        aria-label="From date"
      />
    </div>
    <span class="text-[#6B7280] text-sm mt-4">–</span>
    <div class="flex flex-col gap-1">
      <label for="drp-to" class="text-xs text-[#6B7280] font-medium">To</label>
      <input
        id="drp-to"
        type="date"
        class="input input-bordered input-sm rounded-full text-sm"
        value={toInput}
        onchange={handleToChange}
        data-testid="date-to"
        aria-label="To date"
      />
    </div>
  </div>

  <!-- Validation error -->
  {#if validationError}
    <p class="text-xs text-error" role="alert" data-testid="drp-error">{validationError}</p>
  {/if}
</div>

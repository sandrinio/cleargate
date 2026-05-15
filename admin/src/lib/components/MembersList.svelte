<script lang="ts">
  /**
   * MembersList — CR-062
   *
   * Renders the members table/card layout with icon buttons.
   * Design Guide:
   *   §6.1 data table — no outer border, border-b border-line rows, 56px min-height
   *   §6.4 icon buttons — 40px hit area, mandatory aria-label, title tooltip
   *
   * Props:
   *   members  — array of member DTOs
   *   onresend — called with memberId when Resend (Send) icon is clicked (pending only)
   *   onremove — called with member object when Remove (Trash2) icon is clicked
   */
  import StatusPill from './StatusPill.svelte';
  import { Send, Trash2 } from 'lucide-svelte';

  interface MemberDto {
    id: string;
    project_id: string;
    email: string;
    role: string;
    display_name?: string | null;
    created_at: string;
    status: 'pending' | 'active' | 'expired';
  }

  interface Props {
    members: MemberDto[];
    onresend: (memberId: string) => void;
    onremove: (member: MemberDto) => void;
  }

  let { members, onresend, onremove }: Props = $props();

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      const now = Date.now();
      const diff = now - d.getTime();
      const days = Math.floor(diff / 86400e3);
      if (days === 0) return 'today';
      if (days === 1) return 'yesterday';
      if (days < 30) return `${days}d ago`;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  function statusToVariant(s: string): 'pending' | 'active' | 'expired' | 'revoked' {
    if (s === 'pending' || s === 'active' || s === 'expired' || s === 'revoked') return s;
    return 'pending';
  }
</script>

<!-- Desktop table layout -->
<div class="hidden md:block">
  <table class="w-full" aria-label="Project members">
    <thead>
      <tr>
        <th
          class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
          scope="col"
        >Email</th>
        <th
          class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
          scope="col"
        >Role</th>
        <th
          class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
          scope="col"
        >Status</th>
        <th
          class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
          scope="col"
        >Invited</th>
        <th
          class="text-right text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3"
          scope="col"
        >Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each members as member (member.id)}
        <tr class="border-b border-[#ECE8E1] min-h-[56px]">
          <td class="py-4 pr-4 text-sm text-base-content font-medium">{member.email}</td>
          <td class="py-4 pr-4 text-sm text-[#6B7280] capitalize">{member.role}</td>
          <td class="py-4 pr-4">
            <StatusPill status={statusToVariant(member.status)} />
          </td>
          <td class="py-4 pr-4 text-sm text-[#6B7280]">{formatDate(member.created_at)}</td>
          <td class="py-4 text-right">
            <div class="flex items-center justify-end gap-1">
              {#if member.status === 'pending'}
                <!-- Resend invite — only for pending rows -->
                <button
                  type="button"
                  class="btn btn-circle btn-ghost btn-sm bg-base-200 w-8 h-8 min-h-0 flex items-center justify-center"
                  aria-label="Resend invite to {member.email}"
                  title="Resend invite"
                  onclick={() => onresend(member.id)}
                >
                  <Send size={14} aria-hidden="true" />
                </button>
              {/if}
              <!-- Remove — always shown -->
              <button
                type="button"
                class="btn btn-circle btn-ghost btn-sm bg-base-200 w-8 h-8 min-h-0 flex items-center justify-center text-error"
                aria-label="Remove {member.email}"
                title="Remove member"
                onclick={() => onremove(member)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<!-- Mobile card stack -->
<div class="md:hidden space-y-3">
  {#each members as member (member.id)}
    <div class="bg-base-100 rounded-2xl shadow-card p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-medium text-base-content truncate">{member.email}</p>
          <p class="text-xs text-[#6B7280] capitalize mt-0.5">{member.role} · {formatDate(member.created_at)}</p>
        </div>
        <StatusPill status={statusToVariant(member.status)} />
      </div>
      <div class="mt-3 flex justify-end gap-1">
        {#if member.status === 'pending'}
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm bg-base-200 w-8 h-8 min-h-0 flex items-center justify-center"
            aria-label="Resend invite to {member.email}"
            title="Resend invite"
            onclick={() => onresend(member.id)}
          >
            <Send size={14} aria-hidden="true" />
          </button>
        {/if}
        <button
          type="button"
          class="btn btn-circle btn-ghost btn-sm bg-base-200 w-8 h-8 min-h-0 flex items-center justify-center text-error"
          aria-label="Remove {member.email}"
          title="Remove member"
          onclick={() => onremove(member)}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  {/each}
</div>

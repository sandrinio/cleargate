<script lang="ts">
  /**
   * /projects/[id]/members — Members page — STORY-006-04
   *
   * Client-side only (M3 §2 — no +page.server.ts).
   * Design Guide:
   *   §6.1 data table — no outer border, border-b border-line rows, 56px min-height
   *   §6.7 action buttons — Remove (btn-error), Invite (btn-primary)
   *   §6.12 destructive copy — "Remove <email> from <project>? Their tokens will be revoked."
   *
   * DELETE /admin-api/v1/members/:mid — FLAT path per members.ts:224 + #flat-path flashcard.
   * Uses mcpClient.del() added in STORY-006-05.
   */
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import { get as mcpGet, del as mcpDel } from '$lib/mcp-client.js';
  import { MemberSchema } from 'cleargate/admin-api';
  import { toastStore } from '$lib/stores/toast.js';
  import { z } from 'zod';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import InviteModal from '$lib/components/InviteModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  const projectId = $derived($page.params['id'] ?? '');
  const projectCtx = getContext<{ name: string; createdAt: string; loading: boolean }>('projectContext');

  // Inline MembersListSchema — passthrough status so 'expired' rows don't throw
  // (MemberSchema.status enum will be widened to include 'expired' by Dev C in STORY-006-05)
  const MembersListSchema = z.object({
    members: z.array(
      MemberSchema.extend({ status: z.enum(['pending', 'active', 'expired']) })
    ),
  }).strict();

  type MemberRow = z.infer<typeof MembersListSchema>['members'][number];

  type LoadState = 'loading' | 'loaded' | 'error';

  let loadState = $state<LoadState>('loading');
  let members = $state<MemberRow[]>([]);
  let showInviteModal = $state<boolean>(false);
  let confirmMember = $state<MemberRow | null>(null);
  let removing = $state<boolean>(false);

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

  async function loadMembers() {
    loadState = 'loading';
    try {
      const data = await mcpGet(`/projects/${projectId}/members`, MembersListSchema);
      members = data.members;
      loadState = 'loaded';
    } catch {
      loadState = 'error';
    }
  }

  $effect(() => {
    void loadMembers();
  });

  function openRemoveDialog(member: MemberRow) {
    confirmMember = member;
  }

  function closeRemoveDialog() {
    confirmMember = null;
  }

  async function handleRemoveConfirm() {
    if (!confirmMember || removing) return;
    const target = confirmMember;
    removing = true;

    try {
      await mcpDel(`/members/${target.id}`);

      // Optimistic row removal
      members = members.filter((m) => m.id !== target.id);
      toastStore.success(`Removed ${target.email}`);
    } catch {
      toastStore.error(`Failed to remove ${target.email}. Please try again.`);
    } finally {
      removing = false;
      confirmMember = null;
    }
  }

  function handleInvited() {
    // Refetch members list after a successful invite
    void loadMembers();
  }

  function statusToVariant(s: string): 'pending' | 'active' | 'expired' | 'revoked' {
    if (s === 'pending' || s === 'active' || s === 'expired' || s === 'revoked') return s;
    return 'pending';
  }
</script>

<!-- Page header with Invite CTA -->
<div class="flex items-center justify-between mb-6">
  <h2 class="text-xl font-semibold text-base-content">Members</h2>
  <button
    type="button"
    class="btn btn-primary rounded-full"
    onclick={() => { showInviteModal = true; }}
  >
    Invite
  </button>
</div>

<!-- Members table — Design Guide §6.1 -->
{#if loadState === 'loading'}
  <!-- Skeleton rows -->
  <div class="space-y-2">
    {#each [1, 2, 3] as _}
      <div class="h-14 bg-base-200 rounded-xl animate-pulse"></div>
    {/each}
  </div>

{:else if loadState === 'error'}
  <div class="bg-base-100 rounded-3xl shadow-card p-6">
    <p class="text-sm text-error mb-3">Couldn't load members.</p>
    <button
      type="button"
      class="btn btn-ghost rounded-full"
      onclick={() => void loadMembers()}
    >
      Retry
    </button>
  </div>

{:else if members.length === 0}
  <EmptyState
    headline="No members yet"
    supporting="Invite the first collaborator"
    ctaLabel="Invite"
    onctaclick={() => { showInviteModal = true; }}
  />

{:else}
  <!-- Table — DG §6.1: no outer border, border-b border-line rows, 56px min-height -->
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
              <button
                type="button"
                class="btn btn-sm btn-ghost text-error rounded-full hover:bg-error/10"
                aria-label="Remove {member.email}"
                onclick={() => openRemoveDialog(member)}
                disabled={removing}
              >
                Remove
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile card stack — DG mobile responsive -->
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
        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="btn btn-sm btn-ghost text-error rounded-full"
            aria-label="Remove {member.email}"
            onclick={() => openRemoveDialog(member)}
            disabled={removing}
          >
            Remove
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Invite modal -->
<InviteModal
  open={showInviteModal}
  onclose={() => { showInviteModal = false; }}
  {projectId}
  projectName={projectCtx ? projectCtx.name : undefined}
  onmemberinvited={handleInvited}
/>

<!-- Remove confirm dialog — DG §6.12 destructive copy -->
<ConfirmDialog
  open={confirmMember !== null}
  onclose={closeRemoveDialog}
  onconfirm={handleRemoveConfirm}
  title="Remove member"
  message={confirmMember
    ? `Remove ${confirmMember.email} from ${projectCtx?.name ?? 'this project'}? Their tokens will be revoked. This cannot be undone.`
    : ''}
  confirmLabel="Remove"
  confirmVariant="danger"
/>

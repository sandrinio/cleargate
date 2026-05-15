<script lang="ts">
  /**
   * /projects/[id]/members — Members page — STORY-006-04, CR-062
   *
   * Client-side only (M3 §2 — no +page.server.ts).
   * Design Guide:
   *   §6.1 data table — no outer border, border-b border-line rows, 56px min-height
   *   §6.7 action buttons — Resend (Send icon), Remove (Trash2 icon)
   *   §6.12 destructive copy — "Remove <email> from <project>? Their tokens will be revoked."
   *
   * DELETE /admin-api/v1/members/:mid — FLAT path per members.ts + #flat-path flashcard.
   * POST   /admin-api/v1/members/:mid/resend-invite — CR-062 new route.
   * Uses mcpClient.del() and mcpClient.post() from STORY-006-05.
   */
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import { get as mcpGet, del as mcpDel, post as mcpPost } from '$lib/mcp-client.js';
  import { MemberSchema } from 'cleargate/admin-api';
  import { toastStore } from '$lib/stores/toast.svelte.js';
  import { z } from 'zod';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import InviteModal from '$lib/components/InviteModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import MembersList from '$lib/components/MembersList.svelte';
  import InviteUrlModal from '$lib/components/InviteUrlModal.svelte';

  const projectId = $derived($page.params['id'] ?? '');
  const projectCtx = getContext<{ name: string; createdAt: string; loading: boolean }>('projectContext');

  // Inline MembersListSchema — passthrough status so 'expired' rows don't throw
  const MembersListSchema = z.object({
    members: z.array(
      MemberSchema.extend({ status: z.enum(['pending', 'active', 'expired']) })
    ),
  }).strict();

  type MemberRow = z.infer<typeof MembersListSchema>['members'][number];

  // Resend-invite response schema (CR-062)
  const ResendInviteResponseSchema = z.object({
    invite_token: z.string(),
    invite_url: z.string(),
    expires_at: z.string(),
    mail_sent: z.boolean(),
  }).passthrough();

  type LoadState = 'loading' | 'loaded' | 'error';

  let loadState = $state<LoadState>('loading');
  let members = $state<MemberRow[]>([]);
  let showInviteModal = $state<boolean>(false);
  let confirmMember = $state<MemberRow | null>(null);
  let removing = $state<boolean>(false);

  // InviteUrlModal state (create + resend share the same modal)
  let showInviteUrlModal = $state<boolean>(false);
  let inviteUrlModalData = $state<{
    inviteUrl: string;
    expiresAt: string;
    recipientEmail: string;
    mailSent: boolean;
  } | null>(null);

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

  // Handle resend-invite click — CR-062
  async function handleResendInvite(memberId: string) {
    try {
      const result = await mcpPost(
        `/members/${memberId}/resend-invite`,
        {},
        ResendInviteResponseSchema,
      );
      // Find recipient email from members list
      const member = members.find((m) => m.id === memberId);
      inviteUrlModalData = {
        inviteUrl: result.invite_url,
        expiresAt: result.expires_at,
        recipientEmail: member?.email ?? '',
        mailSent: result.mail_sent,
      };
      showInviteUrlModal = true;
    } catch {
      toastStore.error('Failed to resend invite. Please try again.');
    }
  }

  function closeInviteUrlModal() {
    showInviteUrlModal = false;
    inviteUrlModalData = null;
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
  <MembersList
    {members}
    onresend={handleResendInvite}
    onremove={openRemoveDialog}
  />
{/if}

<!-- Invite modal (create flow) -->
<InviteModal
  open={showInviteModal}
  onclose={() => { showInviteModal = false; }}
  {projectId}
  projectName={projectCtx ? projectCtx.name : undefined}
  onmemberinvited={handleInvited}
/>

<!-- InviteUrlModal — shared between create and resend (CR-062) -->
{#if inviteUrlModalData}
  <InviteUrlModal
    open={showInviteUrlModal}
    inviteUrl={inviteUrlModalData.inviteUrl}
    expiresAt={inviteUrlModalData.expiresAt}
    recipientEmail={inviteUrlModalData.recipientEmail}
    mailSent={inviteUrlModalData.mailSent}
    onclose={closeInviteUrlModal}
  />
{/if}

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

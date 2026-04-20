<script lang="ts">
  /**
   * /projects/[id]/tokens — Tokens page — STORY-006-05
   *
   * Client-side only (M3 §2 — no +page.server.ts).
   * Design Guide:
   *   §6.1 table — no outer border, border-b border-line rows, 56px min-height
   *   §6.7 action buttons — Revoke (btn-error)
   *   §6.8 modals — TokenIssuedModal (bespoke), TokenIssueForm
   *   §6.9 empty states
   *
   * GET /admin-api/v1/projects/:id/tokens → { tokens: TokenMeta[] }
   * GET /admin-api/v1/projects/:id/members → { members: Member[] } (for issue form)
   * POST /admin-api/v1/projects/:id/tokens → TokenIssued (plaintext once)
   * DELETE /admin-api/v1/tokens/:tid — FLAT path per tokens.ts:152 + #flat-path flashcard
   *
   * Status derivation (client-side):
   *   revoked:  revoked_at !== null
   *   expired:  expires_at <= now && revoked_at === null
   *   active:   else
   */
  import { page } from '$app/stores';
  import { get as mcpGet, del as mcpDel } from '$lib/mcp-client.js';
  import { toastStore } from '$lib/stores/toast.js';
  import { TokenMetaSchema, MemberSchema } from 'cleargate/admin-api';
  import type { TokenMeta, TokenIssued, Member } from 'cleargate/admin-api';
  import { z } from 'zod';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import TokenIssueForm from '$lib/components/TokenIssueForm.svelte';
  import TokenIssuedModal from '$lib/components/TokenIssuedModal.svelte';
  import { relative } from '$lib/utils/time-ago.js';

  const projectId = $derived($page.params['id'] ?? '');

  // Inline envelope schemas (M3 §5 — no global envelope schemas)
  const TokensListSchema = z.object({ tokens: z.array(TokenMetaSchema) }).strict();
  const MembersListSchema = z.object({
    members: z.array(MemberSchema.extend({ status: z.enum(['pending', 'active', 'expired']) })),
  }).strict();

  type TokenRow = TokenMeta & { _derivedStatus: 'active' | 'expired' | 'revoked' };
  type MemberOption = Pick<Member, 'id' | 'email'>;

  type LoadState = 'loading' | 'loaded' | 'error';

  let loadState = $state<LoadState>('loading');
  let tokens = $state<TokenRow[]>([]);
  let memberOptions = $state<MemberOption[]>([]);

  let showIssueForm = $state(false);
  let issuedPlaintext = $state('');
  let showIssuedModal = $state(false);

  let confirmToken = $state<TokenRow | null>(null);
  let revoking = $state(false);

  function deriveStatus(t: TokenMeta): 'active' | 'expired' | 'revoked' {
    if (t.revoked_at) return 'revoked';
    if (t.expires_at && new Date(t.expires_at) <= new Date()) return 'expired';
    return 'active';
  }

  function toRow(t: TokenMeta): TokenRow {
    return { ...t, _derivedStatus: deriveStatus(t) };
  }

  async function loadData() {
    loadState = 'loading';
    try {
      const [tokensResult, membersResult] = await Promise.allSettled([
        mcpGet(`/projects/${projectId}/tokens`, TokensListSchema),
        mcpGet(`/projects/${projectId}/members`, MembersListSchema),
      ]);

      if (tokensResult.status === 'fulfilled') {
        // Sort newest first by created_at desc
        tokens = tokensResult.value.tokens
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(toRow);
      } else {
        throw tokensResult.reason;
      }

      if (membersResult.status === 'fulfilled') {
        memberOptions = membersResult.value.members
          .filter((m) => m.status === 'active' || m.status === 'pending')
          .map((m) => ({ id: m.id, email: m.email }));
      }
      // Members failing is non-fatal for listing; issue form will show "no members" state

      loadState = 'loaded';
    } catch {
      loadState = 'error';
    }
  }

  $effect(() => {
    void loadData();
  });

  function handleIssueClick() {
    showIssueForm = true;
  }

  function handleIssueFormClose() {
    showIssueForm = false;
  }

  function handleIssued(result: TokenIssued) {
    // Close the form, open the one-time modal with the plaintext
    showIssueForm = false;
    issuedPlaintext = result.token;
    showIssuedModal = true;
  }

  function handleIssuedModalClose() {
    showIssuedModal = false;
    issuedPlaintext = '';
    // Refetch to include the new token row (without plaintext)
    void loadData();
  }

  function openRevokeDialog(token: TokenRow) {
    confirmToken = token;
  }

  function closeRevokeDialog() {
    confirmToken = null;
  }

  async function handleRevokeConfirm() {
    if (!confirmToken || revoking) return;
    const target = confirmToken;
    revoking = true;

    try {
      // Flat DELETE path per tokens.ts:152 + #flat-path flashcard
      await mcpDel(`/tokens/${target.id}`);

      // Optimistic status flip (idempotent server — 204 even if already revoked)
      tokens = tokens.map((t) =>
        t.id === target.id
          ? { ...t, revoked_at: new Date().toISOString(), _derivedStatus: 'revoked' as const }
          : t,
      );
      toastStore.success('Token revoked');
    } catch {
      toastStore.error('Failed to revoke token. Please try again.');
    } finally {
      revoking = false;
      confirmToken = null;
    }
  }

  function formatExpiry(t: TokenMeta): string {
    if (!t.expires_at) return 'Never';
    return relative(t.expires_at);
  }

  function formatLastUsed(t: TokenMeta): string {
    if (!t.last_used_at) return '—';
    return relative(t.last_used_at);
  }
</script>

<!-- Page header -->
<div class="flex items-center justify-between mb-6">
  <h2 class="text-xl font-semibold text-base-content">Tokens</h2>
  <button
    type="button"
    class="btn btn-primary rounded-full"
    onclick={handleIssueClick}
    disabled={loadState === 'loading'}
  >
    Issue token
  </button>
</div>

<!-- Tokens table — Design Guide §6.1 -->
{#if loadState === 'loading'}
  <div class="space-y-2">
    {#each [1, 2, 3] as _}
      <div class="h-14 bg-base-200 rounded-xl animate-pulse"></div>
    {/each}
  </div>

{:else if loadState === 'error'}
  <div class="bg-base-100 rounded-3xl shadow-card p-6">
    <p class="text-sm text-error mb-3">Couldn't load tokens.</p>
    <button
      type="button"
      class="btn btn-ghost rounded-full"
      onclick={() => void loadData()}
    >
      Retry
    </button>
  </div>

{:else if tokens.length === 0}
  <EmptyState
    headline="No tokens yet"
    supporting="Issue the first one →"
    ctaLabel="Issue token"
    onctaclick={handleIssueClick}
  />

{:else}
  <!-- Desktop table — DG §6.7: no outer border, border-b border-line rows, 56px min-height -->
  <div class="hidden md:block">
    <table class="w-full" aria-label="Project tokens">
      <thead>
        <tr>
          <th
            class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
            scope="col"
          >Name</th>
          <th
            class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
            scope="col"
          >Status</th>
          <th
            class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
            scope="col"
          >Last used</th>
          <th
            class="text-left text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3 pr-4"
            scope="col"
          >Expires</th>
          <th
            class="text-right text-xs uppercase tracking-wide text-[#6B7280] font-semibold pb-3"
            scope="col"
          >Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each tokens as token (token.id)}
          <tr class="border-b border-[#ECE8E1] min-h-[56px]">
            <td class="py-4 pr-4 text-sm text-base-content font-medium">{token.name}</td>
            <td class="py-4 pr-4">
              <StatusPill status={token._derivedStatus} />
            </td>
            <td class="py-4 pr-4 text-sm text-[#6B7280]">{formatLastUsed(token)}</td>
            <td class="py-4 pr-4 text-sm text-[#6B7280]">{formatExpiry(token)}</td>
            <td class="py-4 text-right">
              {#if token._derivedStatus !== 'revoked'}
                <button
                  type="button"
                  class="btn btn-sm btn-ghost text-error rounded-full hover:bg-error/10"
                  aria-label="Revoke {token.name}"
                  onclick={() => openRevokeDialog(token)}
                  disabled={revoking}
                >
                  Revoke
                </button>
              {:else}
                <span class="text-xs text-[#9CA3AF]">Revoked</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile card stack -->
  <div class="md:hidden space-y-3">
    {#each tokens as token (token.id)}
      <div class="bg-base-100 rounded-2xl shadow-card p-4">
        <div class="flex items-start justify-between gap-2 mb-2">
          <p class="text-sm font-medium text-base-content truncate">{token.name}</p>
          <StatusPill status={token._derivedStatus} />
        </div>
        <p class="text-xs text-[#6B7280]">
          Last used: {formatLastUsed(token)} · Expires: {formatExpiry(token)}
        </p>
        {#if token._derivedStatus !== 'revoked'}
          <div class="mt-3 flex justify-end">
            <button
              type="button"
              class="btn btn-sm btn-ghost text-error rounded-full"
              aria-label="Revoke {token.name}"
              onclick={() => openRevokeDialog(token)}
              disabled={revoking}
            >
              Revoke
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<!-- Issue token form modal -->
<TokenIssueForm
  open={showIssueForm}
  {projectId}
  {memberOptions}
  onissued={handleIssued}
  onclose={handleIssueFormClose}
/>

<!-- One-time issued token modal — LOAD-BEARING -->
<TokenIssuedModal
  open={showIssuedModal}
  plaintext={issuedPlaintext}
  onclose={handleIssuedModalClose}
/>

<!-- Revoke confirm dialog — DG §6.12 destructive copy -->
<ConfirmDialog
  open={confirmToken !== null}
  onclose={closeRevokeDialog}
  onconfirm={handleRevokeConfirm}
  title="Revoke token?"
  message={confirmToken
    ? `Revoke "${confirmToken.name}"? Every client using it will be logged out. This cannot be undone.`
    : ''}
  confirmLabel="Revoke"
  confirmVariant="danger"
/>

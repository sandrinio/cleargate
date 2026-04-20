<script lang="ts">
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  import { toastStore } from '$lib/stores/toast.svelte.js';
  import { onMount } from 'svelte';

  const error = $derived($page.url.searchParams.get('error'));
  const errorMessage = $derived(
    error === 'not_authorized'
      ? 'Your GitHub account is not on the admin allowlist. Contact the root admin.'
      : error === 'session_expired'
        ? 'Your session has expired. Please sign in again.'
        : error
          ? 'An error occurred during sign-in. Please try again.'
          : null,
  );

  onMount(() => {
    if (errorMessage) {
      toastStore.error(errorMessage);
    }
  });
</script>

<svelte:head>
  <title>Sign in — ClearGate Admin</title>
</svelte:head>

<Toast />

<div class="min-h-screen bg-base-300 flex items-center justify-center p-4">
  <div class="bg-base-100 rounded-3xl shadow-card p-8 max-w-sm w-full flex flex-col items-center gap-6">
    <!-- Logo -->
    <div class="flex flex-col items-center gap-3">
      <div class="w-12 h-12 bg-primary rounded-[0.75rem] flex items-center justify-center">
        <span class="text-white text-lg font-bold">CG</span>
      </div>
      <h1 class="text-xl font-semibold text-base-content">ClearGate Admin</h1>
    </div>

    <!-- GitHub OAuth sign-in form -->
    <form method="POST" action="/auth/signin/github" class="w-full">
      <button
        type="submit"
        class="btn btn-primary rounded-full w-full"
        aria-label="Sign in with GitHub"
      >
        <svg
          class="w-5 h-5 mr-2"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clip-rule="evenodd"
          />
        </svg>
        Sign in with GitHub
      </button>
    </form>

    <p class="text-xs text-[#6B7280] text-center">
      ClearGate Admin is restricted to approved GitHub users.
    </p>
  </div>
</div>

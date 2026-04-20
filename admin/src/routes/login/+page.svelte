<script lang="ts">
  // Stub login page — real OAuth button comes in STORY-006-02
</script>

<div class="min-h-screen bg-base-300 flex items-center justify-center p-4">
  <div class="bg-base-100 rounded-3xl shadow-card p-8 max-w-sm w-full flex flex-col items-center gap-6">
    <!-- Logo -->
    <div class="flex flex-col items-center gap-3">
      <div class="w-12 h-12 bg-primary rounded-[0.75rem] flex items-center justify-center">
        <span class="text-white text-lg font-bold">CG</span>
      </div>
      <h1 class="text-xl font-semibold text-base-content">ClearGate Admin</h1>
    </div>

    <!-- Sign-in button stub — STORY-006-02 wires GitHub OAuth here -->
    <button
      type="button"
      class="btn btn-primary rounded-full w-full"
      aria-label="Sign in with GitHub"
      disabled
    >
      Sign in with GitHub
    </button>

    <p class="text-xs text-[#6B7280] text-center">
      ClearGate Admin is restricted to approved GitHub users.
    </p>
  </div>
</div>

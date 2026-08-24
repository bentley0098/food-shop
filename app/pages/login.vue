<script setup lang="ts">
// DESIGN.md §5.2 — the one screen allowed a brand moment.
definePageMeta({ layout: 'auth' })

const client = useSupabaseClient()
const loading = ref(false)
const errorMessage = ref('')

async function signInWithGoogle() {
  errorMessage.value = ''
  loading.value = true
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/confirm` },
  })
  if (error) {
    errorMessage.value = 'Google sign-in was interrupted — try again.'
    loading.value = false
  }
  // On success the browser navigates away to Google's consent screen, so
  // `loading` intentionally stays true rather than resetting here.
}
</script>

<template>
  <div
    class="flex w-full flex-1 flex-col items-center"
    style="
      background-image: radial-gradient(rgba(92, 85, 72, 0.03) 1px, transparent 1px);
      background-size: 24px 24px;
    "
  >
    <div class="flex w-full max-w-xs flex-col items-center gap-10 pt-[16dvh] text-center">
      <div>
        <h1 class="u-display text-display text-[var(--ui-text)]">Household Meals</h1>
        <p class="mt-2 text-body text-[var(--ui-text-muted)]">
          Plan the week, generate the shop, tick it off together.
        </p>
      </div>

      <div class="flex w-full flex-col gap-3">
        <p v-if="errorMessage" role="alert" class="text-body-sm text-clay-600">
          {{ errorMessage }}
        </p>
        <BaseButton variant="secondary" size="lg" :loading="loading" @click="signInWithGoogle">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </BaseButton>
        <p class="text-body-sm text-[var(--ui-text-muted)]">
          Sign-in is Google-only — it's how both people in a household share one plan.
        </p>
      </div>

      <div class="w-full border-t border-[var(--ui-line)] pt-4">
        <p class="u-label">Household Meals</p>
      </div>
    </div>
  </div>
</template>

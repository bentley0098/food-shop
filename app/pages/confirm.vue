<script setup lang="ts">
// OAuth callback landing page (nuxt.config.ts `supabase.redirectOptions.callback`).
// @nuxtjs/supabase's client plugin exchanges the code for a session
// automatically; once useSupabaseUser() resolves, hand off to '/' and let
// app/middleware/household.global.ts route onward.
definePageMeta({ layout: 'auth' })

const user = useSupabaseUser()
watch(
  user,
  (value) => {
    if (value) navigateTo('/')
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div
      class="h-8 w-8 animate-spin rounded-full border-2 border-beetroot-600 border-t-transparent"
      aria-hidden="true"
    />
    <p class="text-body-sm text-[var(--ui-text-muted)]">Signing you in…</p>
  </div>
</template>

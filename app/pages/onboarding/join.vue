<script setup lang="ts">
// Dedicated landing page for invite links (`?code=` prefill), separate from
// the two-card fork at /onboarding — DESIGN.md §5.3: pre-fills and
// auto-submits after a 400ms confirmation beat so the user sees what
// happened before it fires.
definePageMeta({ layout: 'auth' })

const route = useRoute()
const store = useHouseholdStore()

const code = ref(typeof route.query.code === 'string' ? route.query.code.toUpperCase() : '')
const joining = ref(false)
const error = ref('')

async function join() {
  if (!code.value.trim()) {
    error.value = 'Enter an invite code'
    return
  }
  error.value = ''
  joining.value = true
  try {
    await $fetch('/api/invites/accept', { method: 'POST', body: { code: code.value.trim() } })
    await store.fetch()
    await navigateTo('/')
  } catch {
    error.value = "That code isn't valid"
  } finally {
    joining.value = false
  }
}

onMounted(() => {
  if (code.value) {
    setTimeout(() => void join(), 400)
  }
})
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-4 text-center">
    <h1 class="u-display text-title-lg text-[var(--ui-text)]">Join a household</h1>
    <BaseInput
      v-model="code"
      label="Invite code"
      placeholder="ABCDEFGHJK"
      autocomplete="one-time-code"
      :error="error"
    />
    <BaseButton :loading="joining" @click="join">Join</BaseButton>
  </div>
</template>

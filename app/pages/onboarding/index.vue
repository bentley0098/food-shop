<script setup lang="ts">
// DESIGN.md §5.3 — two-card fork: create a household, or join one with a
// code. Creating swaps the create card for the invite-display state
// in place, matching "on success → invite screen".
definePageMeta({ layout: 'auth' })

// TODO: drop the `any` once shared/types/database.ts has real generated
// types wired into nuxt.config.ts's `supabase.types` (see comment there).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = useSupabaseClient<any>()
const store = useHouseholdStore()
const config = useRuntimeConfig()

const phase = ref<'fork' | 'invite'>('fork')
const householdName = ref('')
const joinCode = ref('')
const creating = ref(false)
const joining = ref(false)
const createError = ref('')
const joinError = ref('')
const inviteCode = ref('')
const { copy, copied } = useClipboard()

const inviteLink = computed(
  () => `${config.public.siteUrl}/onboarding/join?code=${inviteCode.value}`,
)

async function handleCreate() {
  createError.value = ''
  const name = householdName.value.trim()
  if (!name) {
    createError.value = 'Give your household a name'
    return
  }

  creating.value = true
  const { error } = await client.rpc('create_household', { p_name: name })
  if (error) {
    createError.value = error.message
    creating.value = false
    return
  }
  await store.fetch()

  try {
    const invite = await $fetch<{ code: string }>('/api/invites/create', { method: 'POST' })
    inviteCode.value = invite.code
    phase.value = 'invite'
  } catch {
    await navigateTo('/')
  }
  creating.value = false
}

async function handleJoin() {
  joinError.value = ''
  const code = joinCode.value.trim()
  if (!code) {
    joinError.value = 'Enter an invite code'
    return
  }

  joining.value = true
  try {
    await $fetch('/api/invites/accept', { method: 'POST', body: { code } })
    await store.fetch()
    await navigateTo('/')
  } catch {
    joinError.value = "That code isn't valid"
  } finally {
    joining.value = false
  }
}

function shareInvite() {
  if (navigator.share) {
    void navigator.share({ title: 'Join our household', url: inviteLink.value })
  } else {
    void copy(inviteLink.value)
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <h1 class="u-display text-center text-title-lg text-[var(--ui-text)]">Set up your household</h1>

    <template v-if="phase === 'fork'">
      <section
        class="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--ui-line)] p-4"
      >
        <h2 class="u-label">Create a household</h2>
        <BaseInput
          v-model="householdName"
          label="Household name"
          placeholder="The Smith House"
          :error="createError"
        />
        <BaseButton :loading="creating" @click="handleCreate">Create household</BaseButton>
      </section>

      <section
        class="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--ui-line)] p-4"
      >
        <h2 class="u-label">Join a household</h2>
        <BaseInput
          v-model="joinCode"
          label="Invite code"
          placeholder="ABCDEFGHJK"
          autocomplete="one-time-code"
          :error="joinError"
          class="uppercase"
        />
        <BaseButton variant="secondary" :loading="joining" @click="handleJoin">Join</BaseButton>
      </section>
    </template>

    <section v-else class="flex flex-col items-center gap-4 text-center">
      <p class="text-body text-[var(--ui-text)]">Your household is set up. Share this code:</p>
      <div
        class="w-full rounded-[var(--radius-md)] border border-dashed border-chalk-300 bg-chalk-100 px-6 py-5 dark:bg-soot-800"
      >
        <p class="u-num text-num-lg tracking-[0.15em] text-[var(--ui-text)]">{{ inviteCode }}</p>
      </div>
      <div class="flex w-full gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="copy(inviteLink)">
          {{ copied ? 'Copied!' : 'Copy link' }}
        </BaseButton>
        <BaseButton class="flex-1" @click="shareInvite">Share</BaseButton>
      </div>
      <BaseButton variant="quiet" @click="navigateTo('/')">Skip for now</BaseButton>
    </section>
  </div>
</template>

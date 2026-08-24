<script setup lang="ts">
// DESIGN.md §5.13. household_invites is never selectable by the client
// (SPEC.md §3), so there's no "current" code to show until one is
// generated here or at onboarding — the coupon block starts empty.
definePageMeta({ layout: 'default' })

interface Member {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

// TODO: drop the `any` once shared/types/database.ts has real generated
// types wired into nuxt.config.ts's `supabase.types` (see comment there).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = useSupabaseClient<any>()
const store = useHouseholdStore()
const { copy, copied } = useClipboard()
const config = useRuntimeConfig()

const { data: members } = await useAsyncData<Member[]>(
  'household-members',
  async () => {
    if (!store.household) return []
    const { data } = await client
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .eq('household_id', store.household.id)
      .order('created_at', { ascending: true })
    return data ?? []
  },
  { watch: [() => store.household?.id] },
)

const joinedLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))

const portionSize = computed(() => store.household?.portion_size ?? 2)
async function setPortionSize(next: number) {
  if (!store.household || next < 1) return
  await client.from('households').update({ portion_size: next }).eq('id', store.household.id)
  await store.fetch()
}

const inviteCode = ref('')
const inviteLoading = ref(false)
const inviteLink = computed(
  () => `${config.public.siteUrl}/onboarding/join?code=${inviteCode.value}`,
)

async function regenerateInvite() {
  inviteLoading.value = true
  try {
    const invite = await $fetch<{ code: string }>('/api/invites/create', { method: 'POST' })
    inviteCode.value = invite.code
  } finally {
    inviteLoading.value = false
  }
}

function shareInvite() {
  if (navigator.share) {
    void navigator.share({ title: 'Join our household', url: inviteLink.value })
  } else {
    void copy(inviteLink.value)
  }
}

const leaveConfirmText = ref('')
const leaving = ref(false)
const canLeave = computed(
  () => store.household && leaveConfirmText.value.trim() === store.household.name,
)

async function leaveHousehold() {
  if (!canLeave.value) return
  leaving.value = true
  const { error } = await client.rpc('leave_household')
  leaving.value = false
  if (!error) {
    store.reset()
    await navigateTo('/onboarding')
  }
}
</script>

<template>
  <div>
    <AppHeader title="Household" back @back="navigateTo('/settings')" />
    <div class="flex flex-col gap-6 px-4 py-4">
      <section class="rounded-[var(--radius-md)] bg-[var(--ui-fill)] p-4">
        <p class="text-body text-[var(--ui-text)]">
          Recipes are scaled for
          <span class="font-semibold">{{ portionSize }}</span>
          {{ portionSize === 1 ? 'person' : 'people' }}.
        </p>
        <div class="mt-3 flex items-center gap-3">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--ui-line)] text-title-md text-[var(--ui-text)]"
            aria-label="Decrease portion size"
            @click="setPortionSize(portionSize - 1)"
          >
            −
          </button>
          <span class="u-num w-6 text-center text-title-md text-[var(--ui-text)]">{{
            portionSize
          }}</span>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--ui-line)] text-title-md text-[var(--ui-text)]"
            aria-label="Increase portion size"
            @click="setPortionSize(portionSize + 1)"
          >
            +
          </button>
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="u-label px-1">Members</h2>
        <div
          v-for="member in members"
          :key="member.id"
          class="flex items-center gap-3 border-b border-[var(--ui-line)] py-2 last:border-b-0"
        >
          <img
            v-if="member.avatar_url"
            :src="member.avatar_url"
            alt=""
            class="h-9 w-9 rounded-full"
          />
          <div v-else class="h-9 w-9 rounded-full bg-[var(--ui-fill)]" aria-hidden="true" />
          <div>
            <p class="text-body text-[var(--ui-text)]">{{ member.display_name ?? 'Member' }}</p>
            <p class="text-body-sm text-[var(--ui-text-muted)]">
              Joined {{ joinedLabel(member.created_at) }}
            </p>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="u-label px-1">Invite</h2>
        <div
          class="rounded-[var(--radius-md)] border border-dashed border-chalk-300 bg-chalk-100 px-6 py-5 text-center dark:bg-soot-800"
        >
          <p v-if="inviteCode" class="u-num text-num-lg tracking-[0.15em] text-[var(--ui-text)]">
            {{ inviteCode }}
          </p>
          <p v-else class="text-body-sm text-[var(--ui-text-muted)]">
            Generate a code to invite someone
          </p>
        </div>
        <div class="flex gap-3">
          <BaseButton
            variant="secondary"
            class="flex-1"
            :loading="inviteLoading"
            @click="regenerateInvite"
          >
            {{ inviteCode ? 'Regenerate' : 'Generate code' }}
          </BaseButton>
          <BaseButton v-if="inviteCode" class="flex-1" @click="shareInvite">
            {{ copied ? 'Copied!' : 'Share' }}
          </BaseButton>
        </div>
      </section>

      <section class="flex flex-col gap-3 border-t border-[var(--ui-line)] pt-6">
        <h2 class="u-label px-1 text-clay-600">Leave household</h2>
        <p class="px-1 text-body-sm text-[var(--ui-text-muted)]">
          Type the household name ("{{ store.household?.name }}") to confirm.
        </p>
        <BaseInput v-model="leaveConfirmText" :placeholder="store.household?.name ?? ''" />
        <BaseButton
          variant="danger"
          :disabled="!canLeave"
          :loading="leaving"
          @click="leaveHousehold"
        >
          Leave household
        </BaseButton>
      </section>
    </div>
  </div>
</template>

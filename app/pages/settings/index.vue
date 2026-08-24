<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

// DESIGN.md §5.13 — grouped rows under u-label headers. FOOD (pantry) is a
// Phase 1 addition once staples/regulars exist.
definePageMeta({ layout: 'default' })

const user = useSupabaseUser()
const client = useSupabaseClient()
const store = useHouseholdStore()
const theme = useTheme()

const themeOptions = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

async function signOut() {
  await client.auth.signOut()
  store.reset()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <AppHeader title="Settings" />
    <div class="flex flex-col gap-6 px-4 py-4">
      <section class="flex flex-col gap-2">
        <h2 class="u-label px-1">Account</h2>
        <div
          class="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ui-line)] p-3"
        >
          <img
            v-if="store.profile?.avatar_url"
            :src="store.profile.avatar_url"
            alt=""
            class="h-10 w-10 rounded-full"
          />
          <div v-else class="h-10 w-10 rounded-full bg-[var(--ui-fill)]" aria-hidden="true" />
          <div class="flex-1">
            <p class="text-body font-semibold text-[var(--ui-text)]">
              {{ store.profile?.display_name ?? 'You' }}
            </p>
            <p class="text-body-sm text-[var(--ui-text-muted)]">{{ user?.email }}</p>
          </div>
        </div>
        <BaseButton variant="quiet" class="w-full justify-start" @click="signOut">
          Sign out
        </BaseButton>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="u-label px-1">Appearance</h2>
        <div class="flex gap-2">
          <BaseChip
            v-for="option in themeOptions"
            :key="option.value"
            :selected="theme === option.value"
            @click="theme = option.value"
          >
            {{ option.label }}
          </BaseChip>
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="u-label px-1">Household</h2>
        <NuxtLink
          to="/settings/household"
          class="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--ui-line)] p-3 text-body text-[var(--ui-text)]"
        >
          <span>{{ store.household?.name ?? 'Household' }}</span>
          <ChevronRight :size="18" :stroke-width="1.75" class="text-[var(--ui-text-muted)]" />
        </NuxtLink>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="u-label px-1">About</h2>
        <p class="px-1 text-body-sm text-[var(--ui-text-muted)]">Household Meals v0.1</p>
      </section>
    </div>
  </div>
</template>

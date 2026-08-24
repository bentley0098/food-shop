import { defineStore } from 'pinia'
import type { Household, Profile } from '#shared/types/household'

/**
 * The household + active-week stores are the only Pinia state in this app
 * (SPEC.md §1) — everything else prefers useAsyncData. This one holds the
 * signed-in user's profile and household, fetched once per session and read
 * everywhere through useHousehold() (PLAN.md §0.4), so the eventual
 * many-to-many households migration only has to change one place.
 */
export const useHouseholdStore = defineStore('household', () => {
  const profile = ref<Profile | null>(null)
  const household = ref<Household | null>(null)
  const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

  async function fetch() {
    const user = useSupabaseUser()
    if (!user.value) {
      reset()
      return
    }
    if (status.value === 'success' && profile.value?.id === user.value.id) {
      return
    }

    status.value = 'pending'
    // TODO: drop the `any` once shared/types/database.ts has real generated
    // types wired into nuxt.config.ts's `supabase.types`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = useSupabaseClient<any>()
    const { data, error } = await client
      .from('profiles')
      .select('*, households(*)')
      .eq('id', user.value.id)
      .single()

    if (error || !data) {
      status.value = 'error'
      return
    }

    const { households, ...profileRow } = data as Profile & { households: Household | null }
    profile.value = profileRow
    household.value = households
    status.value = 'success'
  }

  function reset() {
    profile.value = null
    household.value = null
    status.value = 'idle'
  }

  return { profile, household, status, fetch, reset }
})

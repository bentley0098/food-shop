/**
 * Runs after @nuxtjs/supabase's own `global-auth` middleware (which only
 * knows authenticated vs not). This is the household-membership branch on
 * top of it: authenticated + no household_id → /onboarding, and the
 * reverse, per PLAN.md §0.4.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/dev')) return

  const user = useSupabaseUser()
  if (!user.value) return

  const store = useHouseholdStore()
  await store.fetch()

  const hasHousehold = !!store.household
  const onOnboarding = to.path.startsWith('/onboarding')

  if (to.path === '/login') {
    return navigateTo(hasHousehold ? '/' : '/onboarding')
  }
  if (!hasHousehold && !onOnboarding) {
    return navigateTo('/onboarding')
  }
  if (hasHousehold && onOnboarding) {
    return navigateTo('/')
  }
})

<script setup lang="ts">
// Home screen placeholder. The real "this week at a glance" build is
// DESIGN.md §5.4 (Phase 2) — this stub exists so Phase 0's redirect chain
// (login → onboarding → home) lands somewhere real rather than a 404.
definePageMeta({ layout: 'default' })

const store = useHouseholdStore()
</script>

<template>
  <div>
    <AppHeader :title="store.household?.name ?? 'Household Meals'" />
    <EmptyState
      title="This week at a glance"
      description="The planner lands in Phase 2 — for now, you're signed in and your household is set up."
    />
  </div>
</template>

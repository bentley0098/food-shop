<script setup lang="ts">
// Recipe library — DESIGN.md §5.6, built in Phase 1.
definePageMeta({ layout: 'default' })
</script>

<template>
  <div>
    <AppHeader title="Recipes" />
    <EmptyState title="No recipes yet" description="The recipe library arrives in Phase 1." />
  </div>
</template>

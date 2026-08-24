<script setup lang="ts">
// Shopping list — the product (DESIGN.md §5.9), built in Phase 3.
definePageMeta({ layout: 'default' })
</script>

<template>
  <div>
    <AppHeader title="List" />
    <EmptyState title="No shopping list yet" description="List generation arrives in Phase 3." />
  </div>
</template>

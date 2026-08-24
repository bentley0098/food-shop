<script setup lang="ts">
// DESIGN.md §4.1 — 28px pill, used for filters, recipe meta, and aisle tags.
withDefaults(defineProps<{ selected?: boolean; as?: string }>(), {
  selected: false,
  as: 'button',
})
</script>

<template>
  <component
    :is="as"
    class="inline-flex h-7 items-center whitespace-nowrap rounded-full border px-3 text-body-sm transition-colors"
    :class="
      selected
        ? 'border-beetroot-600 bg-beetroot-50 text-beetroot-600'
        : 'border-transparent bg-[var(--ui-fill)] text-[var(--ui-text)]'
    "
  >
    <slot />
  </component>
</template>

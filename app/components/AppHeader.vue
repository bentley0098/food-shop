<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'

// DESIGN.md §4.2 — 56px row, gains a hairline only after scrolling past 8px
// (no shadow, no blur).
defineProps<{ title: string; back?: boolean }>()
const emit = defineEmits<{ back: [] }>()

const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 8)

function goBack() {
  emit('back')
}
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-14 items-center gap-1 border-b bg-[var(--ui-ground)] px-2 transition-colors duration-150"
    :class="scrolled ? 'border-[var(--ui-line)]' : 'border-transparent'"
  >
    <button
      v-if="back"
      type="button"
      aria-label="Back"
      class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--ui-text)]"
      @click="goBack"
    >
      <ChevronLeft :size="24" :stroke-width="1.75" />
    </button>
    <h1 class="u-display flex-1 truncate text-title-lg text-[var(--ui-text)]">{{ title }}</h1>
    <div class="flex items-center gap-1">
      <slot name="actions" />
    </div>
  </header>
</template>

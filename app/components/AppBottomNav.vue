<script setup lang="ts">
import { CalendarDays, BookOpen, ShoppingBasket, Settings } from '@lucide/vue'

// DESIGN.md §4.2 — 4 tabs, safe-area, chalk-underline active state.
// Becomes a 240px left rail at ≥lg (widened slightly here to 60 Tailwind
// units / 240px to match). List's unchecked/stale badge slot lands in
// Phase 3 once shopping_lists exists.
const route = useRoute()

const items = [
  { to: '/plan', label: 'Week', icon: CalendarDays },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
  { to: '/list', label: 'List', icon: ShoppingBasket },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav
    aria-label="Primary"
    class="fixed inset-x-0 bottom-0 z-40 flex h-16 bg-[var(--ui-surface)] shadow-[var(--shadow-bar)] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-60 lg:flex-col lg:gap-1 lg:border-r lg:border-[var(--ui-line)] lg:pt-6 lg:shadow-none"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] lg:mx-3 lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-[var(--radius-md)] lg:px-3 lg:py-2.5 lg:text-body"
      :class="isActive(item.to) ? 'text-beetroot-600' : 'text-[var(--ui-text-muted)]'"
    >
      <span
        v-if="isActive(item.to)"
        aria-hidden="true"
        class="absolute inset-x-3 top-0 h-[3px] rounded-full bg-beetroot-600 lg:hidden"
      />
      <component :is="item.icon" :size="24" :stroke-width="1.75" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

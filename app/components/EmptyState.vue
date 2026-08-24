<script setup lang="ts">
// DESIGN.md §4.1 — stencil mark, one specific instructive line, one action.
// The default mark is a generic crate; screens with a bespoke stencil (blank
// week, unticked list) pass their own via the #mark slot.
defineProps<{ title: string; description?: string; actionLabel?: string }>()
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 px-6 py-12 text-center">
    <slot name="mark">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        stroke="var(--color-chalk-300)"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <rect x="16" y="28" width="64" height="44" rx="4" />
        <path d="M16 44h64M32 28v-8h32v8" />
      </svg>
    </slot>
    <h2 class="u-display text-title-md text-[var(--ui-text)]">{{ title }}</h2>
    <p v-if="description" class="max-w-xs text-body-sm text-[var(--ui-text-muted)]">
      {{ description }}
    </p>
    <BaseButton v-if="actionLabel" @click="emit('action')">{{ actionLabel }}</BaseButton>
  </div>
</template>

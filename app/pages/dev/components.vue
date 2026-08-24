<script setup lang="ts">
import { AISLES } from '#shared/constants/aisles'

// Dev-only primitive gallery (PLAN.md §0.3 — "each with a story/demo page
// under a dev-only route"). 404s outside `nuxt dev`.
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}

definePageMeta({ layout: false })

const theme = useTheme()
const sheetOpen = ref(false)
const inputValue = ref('')
const { show } = useToast()
const aisles = AISLES
</script>

<template>
  <div class="mx-auto max-w-[640px] space-y-10 p-6">
    <header class="flex items-center justify-between">
      <h1 class="u-display text-title-lg text-[var(--ui-text)]">Primitive gallery</h1>
      <BaseSelect
        v-model="theme"
        :options="[
          { value: 'auto', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]"
        class="w-32"
      />
    </header>

    <section class="space-y-3">
      <h2 class="u-label">BaseButton</h2>
      <div class="flex flex-wrap gap-3">
        <BaseButton variant="primary">Primary</BaseButton>
        <BaseButton variant="secondary">Secondary</BaseButton>
        <BaseButton variant="quiet">Quiet</BaseButton>
        <BaseButton variant="danger">Danger</BaseButton>
        <BaseButton loading>Loading</BaseButton>
        <BaseButton disabled>Disabled</BaseButton>
        <BaseButton size="lg">Large</BaseButton>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="u-label">BaseInput</h2>
      <BaseInput v-model="inputValue" label="Household name" placeholder="The Smith House" />
      <BaseInput label="With error" error="This field is required" />
    </section>

    <section class="space-y-3">
      <h2 class="u-label">BaseChip</h2>
      <div class="flex gap-2">
        <BaseChip>All</BaseChip>
        <BaseChip selected>Quick &lt;30 min</BaseChip>
        <BaseChip>Recently added</BaseChip>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="u-label">BaseSheet</h2>
      <BaseButton @click="sheetOpen = true">Open sheet</BaseButton>
      <BaseSheet v-model:open="sheetOpen" title="Example sheet">
        <p class="pb-6 text-body text-[var(--ui-text)]">
          Drag the handle down, tap the scrim, or press Esc to close.
        </p>
      </BaseSheet>
    </section>

    <section class="space-y-3">
      <h2 class="u-label">BaseToast</h2>
      <BaseButton
        variant="secondary"
        @click="show('Item removed', { actionLabel: 'Undo', onAction: () => {} })"
      >
        Show toast
      </BaseButton>
    </section>

    <section class="space-y-3">
      <h2 class="u-label">EmptyState</h2>
      <EmptyState
        title="No recipes yet"
        description="Add the one you cook most often."
        action-label="Add a recipe"
      />
    </section>

    <section class="space-y-3">
      <h2 class="u-label">Skeletons</h2>
      <SkeletonRow />
      <SkeletonRow />
      <div class="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="u-label">Type scale</h2>
      <p class="u-display text-display text-[var(--ui-text)]">Display</p>
      <p class="u-display text-title-lg text-[var(--ui-text)]">Title / lg</p>
      <p class="u-display text-title-md text-[var(--ui-text)]">Title / md</p>
      <p class="text-title-sm font-semibold text-[var(--ui-text)]">Title / sm</p>
      <p class="text-body text-[var(--ui-text)]">Body</p>
      <p class="text-body-sm text-[var(--ui-text-muted)]">Body small / muted</p>
      <p class="u-label">Label stencil</p>
      <p class="u-num text-num-lg text-[var(--ui-text)]">12/27</p>
    </section>

    <section class="space-y-3">
      <h2 class="u-label">Aisles</h2>
      <ul class="grid grid-cols-2 gap-2">
        <li
          v-for="aisle in aisles"
          :key="aisle.id"
          class="flex items-center gap-2 text-body-sm text-[var(--ui-text)]"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :style="{ backgroundColor: aisle.dot }"
            aria-hidden="true"
          />
          {{ aisle.label }}
        </li>
      </ul>
    </section>
  </div>
</template>

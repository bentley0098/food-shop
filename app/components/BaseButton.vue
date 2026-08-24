<script setup lang="ts">
// DESIGN.md §4.1. Loading swaps the label for a spinner without changing
// width (the slot stays laid out, just invisible). Disabled stays
// focusable with aria-disabled rather than the native `disabled` attribute,
// which would pull it out of the tab order.
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
    size?: 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    type: 'button',
  },
)

function guardClick(event: MouseEvent) {
  if (props.disabled || props.loading) {
    event.preventDefault()
    event.stopPropagation()
  }
}
</script>

<template>
  <button
    :type="type"
    :aria-disabled="disabled || loading"
    :aria-busy="loading"
    class="relative inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-sans text-body font-semibold transition-transform duration-[120ms] ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none"
    :class="[
      size === 'lg' ? 'h-[52px] px-6' : 'h-[44px] px-5',
      disabled || loading ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      {
        'bg-beetroot-600 text-chalk-0 hover:brightness-95': variant === 'primary',
        'border border-[var(--ui-line)] bg-[var(--ui-surface)] text-[var(--ui-text)]':
          variant === 'secondary',
        'bg-transparent text-ash-700 dark:text-soot-300': variant === 'quiet',
        'bg-clay-600 text-chalk-0': variant === 'danger',
      },
    ]"
    @click.capture="guardClick"
  >
    <span
      v-if="loading"
      class="absolute h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <span class="inline-flex items-center gap-2" :class="{ invisible: loading }">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
// DESIGN.md §4.1 — bottom, above the nav bar, one optional action.
const { toast, dismiss } = useToast()

function handleAction() {
  toast.value?.onAction?.()
  dismiss()
}
</script>

<template>
  <Transition name="toast">
    <div
      v-if="toast"
      role="status"
      class="fixed inset-x-4 z-50 mx-auto flex max-w-[calc(640px-2rem)] items-center justify-between gap-3 rounded-[10px] bg-ink-900 px-4 py-3 text-body-sm text-chalk-50 shadow-[var(--shadow-sheet)] dark:bg-chalk-0 dark:text-ink-900"
      style="bottom: calc(64px + env(safe-area-inset-bottom) + 12px)"
    >
      <span>{{ toast.message }}</span>
      <button
        v-if="toast.actionLabel"
        type="button"
        class="shrink-0 font-semibold text-beetroot-300 dark:text-beetroot-600"
        @click="handleAction"
      >
        {{ toast.actionLabel }}
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    transform var(--motion-move) var(--ease-out-soft),
    opacity var(--motion-move) var(--ease-out-soft);
}
.toast-enter-from,
.toast-leave-to {
  transform: translateY(8px);
  opacity: 0;
}
</style>

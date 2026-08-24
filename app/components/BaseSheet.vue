<script setup lang="ts">
// DESIGN.md §4.1 — the app's only modal pattern; there are no centred
// dialogs on mobile. Focus trap, Esc, scroll lock, focus restore, and
// aria-modal all come from Reka's DialogRoot/DialogContent and are not
// reimplemented (DECISIONS.md F). Drag-to-dismiss below 25% is the one
// piece of behaviour Reka doesn't provide, so it's hand-rolled below.
const props = defineProps<{ title?: string }>()
const open = defineModel<boolean>('open', { default: false })

const sheetEl = useTemplateRef<HTMLDivElement>('sheetEl')
const dragOffset = ref(0)
let dragging = false
let dragStartY = 0

function onPointerDown(event: PointerEvent) {
  dragging = true
  dragStartY = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging) return
  dragOffset.value = Math.max(0, event.clientY - dragStartY)
}

function onPointerUp() {
  if (!dragging) return
  dragging = false
  const height = sheetEl.value?.offsetHeight ?? 1
  if (dragOffset.value / height > 0.25) {
    open.value = false
  }
  dragOffset.value = 0
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-ink-900/40 data-[state=closed]:animate-[sheet-fade-out_200ms_var(--ease-sheet)] data-[state=open]:animate-[sheet-fade-in_260ms_var(--ease-sheet)]"
      />
      <DialogContent
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[var(--radius-sheet)] bg-[var(--ui-surface)] shadow-[var(--shadow-sheet)] data-[state=closed]:animate-[sheet-slide-down_200ms_var(--ease-sheet)] data-[state=open]:animate-[sheet-slide-up_260ms_var(--ease-sheet)]"
      >
        <div
          ref="sheetEl"
          class="flex flex-1 flex-col overflow-hidden"
          :style="
            dragOffset
              ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
              : undefined
          "
        >
          <div
            class="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <span aria-hidden="true" class="h-1 w-9 rounded-full bg-chalk-300" />
          </div>
          <DialogTitle
            :class="
              props.title ? 'u-display px-4 pb-2 text-title-md text-[var(--ui-text)]' : 'sr-only'
            "
          >
            {{ props.title ?? 'Dialog' }}
          </DialogTitle>
          <div class="flex-1 overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <slot />
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

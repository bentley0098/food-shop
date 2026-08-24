<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'

// DESIGN.md §4.1 — over Reka's SelectRoot for keyboard nav, typeahead, and
// listbox ARIA; styled entirely with our tokens.
defineProps<{
  label?: string
  placeholder?: string
  options: { value: string; label: string }[]
}>()
const modelValue = defineModel<string>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="u-label">{{ label }}</label>
    <SelectRoot v-model="modelValue">
      <SelectTrigger
        class="flex h-12 items-center justify-between rounded-[var(--radius-sm)] border border-[var(--ui-line)] bg-[var(--ui-fill)] px-3 text-body text-[var(--ui-text)]"
      >
        <SelectValue :placeholder="placeholder" />
        <SelectIcon>
          <ChevronDown :size="18" :stroke-width="1.75" />
        </SelectIcon>
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          class="z-50 overflow-hidden rounded-[var(--radius-md)] border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-[var(--shadow-sheet)]"
          position="popper"
          :side-offset="4"
        >
          <SelectViewport class="p-1">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              class="flex h-11 cursor-pointer items-center justify-between rounded-[var(--radius-sm)] px-3 text-body text-[var(--ui-text)] outline-none data-[highlighted]:bg-[var(--ui-fill)]"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator>
                <Check :size="16" :stroke-width="1.75" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>

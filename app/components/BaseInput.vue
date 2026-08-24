<script setup lang="ts">
// DESIGN.md §4.1 — 48px min-height, 16px min font (iOS zoom-on-focus), error
// tied to the field via aria-describedby.
const props = withDefaults(
  defineProps<{
    label?: string
    error?: string
    type?: string
    inputmode?: 'text' | 'decimal' | 'numeric' | 'email' | 'search' | 'tel' | 'url' | 'none'
    placeholder?: string
    id?: string
    numeric?: boolean
    autocomplete?: string
  }>(),
  { type: 'text' },
)

const modelValue = defineModel<string>({ default: '' })

const uid = useId()
const inputId = computed(() => props.id ?? `input-${uid}`)
const errorId = computed(() => `${inputId.value}-error`)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="inputId" class="u-label">{{ label }}</label>
    <input
      :id="inputId"
      v-model="modelValue"
      :type="type"
      :inputmode="inputmode ?? (numeric ? 'decimal' : undefined)"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :aria-invalid="!!error"
      :aria-describedby="error ? errorId : undefined"
      class="min-h-[48px] rounded-[var(--radius-sm)] border bg-[var(--ui-fill)] px-3 text-body text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)]"
      :class="[
        error ? 'border-clay-600' : 'border-[var(--ui-line)]',
        numeric ? 'u-num text-right' : '',
      ]"
    />
    <p v-if="error" :id="errorId" class="text-body-sm text-clay-600">{{ error }}</p>
  </div>
</template>

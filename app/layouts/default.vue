<template>
  <div class="lg:pl-60">
    <div class="mx-auto min-h-dvh max-w-[640px] pb-[calc(64px+env(safe-area-inset-bottom))]">
      <slot />
    </div>
    <AppBottomNav />
    <BaseToast />
  </div>
</template>

interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * Singleton toast state (DESIGN.md §4.1) — never stacks more than one; a
 * second call replaces the first. 4s auto-dismiss, one optional action
 * (always "Undo" in practice).
 */
export function useToast() {
  const toast = useState<ToastState | null>('toast', () => null)
  const timer = useState<ReturnType<typeof setTimeout> | null>('toast-timer', () => null)

  function show(message: string, options?: { actionLabel?: string; onAction?: () => void }) {
    if (timer.value) clearTimeout(timer.value)
    toast.value = {
      id: Date.now(),
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    }
    timer.value = setTimeout(() => {
      toast.value = null
    }, 4000)
  }

  function dismiss() {
    if (timer.value) clearTimeout(timer.value)
    toast.value = null
  }

  return { toast, show, dismiss }
}

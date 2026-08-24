export const THEME_STORAGE_KEY = 'theme'

/**
 * Three-way System/Light/Dark switch, persisted in localStorage under
 * `theme` (DESIGN.md §2.6, PLAN.md §0.2). `.dark` on <html> is the only
 * class this ever writes — light mode is simply its absence, matching
 * `main.css`'s `:root` / `.dark` split.
 *
 * The anti-flash inline script in nuxt.config.ts's `app.head.script` reads
 * this same key and same resolution rule before Vue mounts, so this
 * composable's own onMounted class write is always a no-op in practice.
 */
export function useTheme() {
  return useColorMode({
    attribute: 'class',
    storageKey: THEME_STORAGE_KEY,
    modes: {},
  })
}

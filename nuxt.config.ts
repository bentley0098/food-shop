import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'reka-ui/nuxt',
    '@nuxt/fonts',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      script: [
        {
          // Runs before first paint, outside Vue, so a stored "dark"
          // preference never flashes light on reload (PLAN.md §0.2). Reads
          // the same `theme` localStorage key useTheme() writes.
          innerHTML: `(function(){try{var s=localStorage.getItem('theme');if(s){s=s.replace(/^"|"$/g,'');}var m=s||'auto';var d=m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
        },
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  runtimeConfig: {
    public: {
      // Used to build invite links (SPEC.md §2, INFRASTRUCTURE.md §5.1).
      siteUrl: '',
    },
  },

  // The module's own global middleware only knows authenticated vs not
  // (login/callback are auto-excluded from the login requirement).
  // Onboarding *does* require auth — the household-membership branch on top
  // of it is our own app/middleware/household.global.ts (PLAN.md §0.4).
  // No `types` pointer yet: shared/types/database.ts is still a hand-written
  // stub (no local Supabase instance to `supabase gen types` against in this
  // environment — INFRASTRUCTURE.md §4 needs Docker). Left unset, the
  // module falls back to `Database = unknown`, which is permissive rather
  // than the stub's empty-Tables type, which typechecks every `.from()`/
  // `.rpc()` call as an error. Point this at the real path once generated.
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      cookieRedirect: false,
      // /dev/** pages 404 outside `nuxt dev` themselves (see
      // app/pages/dev/*.vue), so excluding them from the auth requirement
      // here doesn't widen production's surface.
      exclude: ['/dev/**'],
    },
  },

  // @nuxt/fonts downloads and self-hosts these at build time (DESIGN.md §2.2) —
  // no runtime request to Google Fonts.
  fonts: {
    families: [
      { name: 'Fraunces', provider: 'google', display: 'swap' },
      { name: 'Instrument Sans', provider: 'google', display: 'swap' },
    ],
  },

  // Installed now per PLAN.md §0.1; manifest, icons, and precache strategy
  // are a Phase 5 deliverable (PLAN.md §5.1). Disabled until then.
  pwa: {
    disable: true,
    manifest: {
      name: 'Household Meals',
      short_name: 'Meals',
      display: 'standalone',
      theme_color: '#FAF6EF',
      background_color: '#FAF6EF',
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(self), geolocation=(), microphone=(), payment=()',
      },
    },
  },

  // No `nitro.preset` here, deliberately: Vercel auto-detects Nuxt and
  // applies the `vercel` preset itself at deploy time (INFRASTRUCTURE.md
  // §2.1). Hardcoding it here breaks `nuxt preview` locally and in CI
  // ("Preview is not supported for this build") since the vercel preset's
  // `.vercel/output/functions/*.func` layout isn't previewable the way the
  // default node-server preset's `.output/server` is — and CI's e2e step
  // depends on `npm run preview` working.

  eslint: {
    config: {
      stylistic: false,
    },
  },
})

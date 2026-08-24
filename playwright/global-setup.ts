import { createClient } from '@supabase/supabase-js'
import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'

/**
 * Mints real, signed-in Supabase sessions for two test users against the
 * LOCAL Supabase instance only, via the Admin API — never against the
 * hosted project (INFRASTRUCTURE.md §7.1). No test route ships in the app;
 * this is the entire mechanism.
 */
const LOCAL_SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const LOCAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const LOCAL_ANON_KEY = process.env.SUPABASE_KEY ?? ''

// @nuxtjs/supabase stores the session in a cookie, not localStorage
// (`useSsrCookies: true` is the module default, so the server-rendered
// request can read it too). The cookie name is derived from the URL —
// this is the exact formula the module itself uses
// (@nuxtjs/supabase/dist/module.mjs), reproduced here so the cookie we
// write is the one the app actually reads.
const AUTH_COOKIE_NAME = `sb-${new URL(LOCAL_SUPABASE_URL).hostname.split('.')[0]}-auth-token`

const TEST_USERS = [
  { email: 'alice@test.local', password: 'test-password-alice', storageState: 'alice.json' },
  { email: 'bob@test.local', password: 'test-password-bob', storageState: 'bob.json' },
]

export default async function globalSetup(_config: FullConfig) {
  if (!LOCAL_SERVICE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_KEY is not set. Run `supabase start` and export the printed ' +
        'service_role key before running Playwright (see INFRASTRUCTURE.md §7.1).',
    )
  }

  const admin = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const authDir = path.join(process.cwd(), 'playwright/.auth')
  mkdirSync(authDir, { recursive: true })

  // Bundles @supabase/ssr's createBrowserClient for the browser so session
  // injection goes through the exact same cookie-writing code path the app
  // itself uses — no hand-guessing @supabase/ssr's cookie value encoding or
  // chunking rules.
  const bundle = await build({
    stdin: {
      contents: `
        import { createBrowserClient } from '@supabase/ssr'
        window.__setTestSession = async (url, anonKey, cookieName, session) => {
          const client = createBrowserClient(url, anonKey, { cookieOptions: { name: cookieName } })
          const { error } = await client.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
          if (error) throw error
        }
      `,
      resolveDir: process.cwd(),
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    write: false,
  })
  const sessionInjectorScript = bundle.outputFiles[0].text

  const browser = await chromium.launch()

  for (const user of TEST_USERS) {
    const { data: existing } = await admin.auth.admin.listUsers()
    const alreadyExists = existing?.users.some((u) => u.email === user.email)

    if (!alreadyExists) {
      const { error } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })
      if (error) throw new Error(`Failed to create test user ${user.email}: ${error.message}`)
    }

    const client = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY)
    const { data: session, error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })
    if (signInError || !session.session) {
      throw new Error(`Failed to sign in test user ${user.email}: ${signInError?.message}`)
    }

    const page = await browser.newPage()
    await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000')
    await page.addScriptTag({ content: sessionInjectorScript })
    await page.evaluate(
      async ({ url, anonKey, cookieName, currentSession }) => {
        // @ts-expect-error — global from the injected bundle above
        await window.__setTestSession(url, anonKey, cookieName, currentSession)
      },
      {
        url: LOCAL_SUPABASE_URL,
        anonKey: LOCAL_ANON_KEY,
        cookieName: AUTH_COOKIE_NAME,
        currentSession: session.session,
      },
    )
    await page.context().storageState({ path: path.join(authDir, user.storageState) })
    await page.close()
  }

  await browser.close()
}

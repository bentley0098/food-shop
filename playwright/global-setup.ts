import { createClient } from '@supabase/supabase-js'
import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Mints real, signed-in Supabase sessions for two test users against the
 * LOCAL Supabase instance only, via the Admin API — never against the
 * hosted project (INFRASTRUCTURE.md §7.1). No test route ships in the app;
 * this is the entire mechanism.
 */
const LOCAL_SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const LOCAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

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

    const client = createClient(LOCAL_SUPABASE_URL, process.env.SUPABASE_KEY ?? '')
    const { data: session, error: signInError } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })
    if (signInError || !session.session) {
      throw new Error(`Failed to sign in test user ${user.email}: ${signInError?.message}`)
    }

    // Sets the session on a real page via the app's own client library (bundled
    // locally, no CDN fetch) so cookies/storage land exactly where @nuxtjs/supabase
    // expects them — the same shape a browser OAuth sign-in would produce.
    const page = await browser.newPage()
    await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000')
    await page.addScriptTag({
      path: require.resolve('@supabase/supabase-js/dist/umd/supabase.js'),
    })
    await page.evaluate(
      async ({ url, anonKey, currentSession }) => {
        // @ts-expect-error — global from the injected UMD bundle
        const c = window.supabase.createClient(url, anonKey)
        await c.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        })
      },
      {
        url: LOCAL_SUPABASE_URL,
        anonKey: process.env.SUPABASE_KEY ?? '',
        currentSession: session.session,
      },
    )
    await page.context().storageState({ path: path.join(authDir, user.storageState) })
    await page.close()
  }

  await browser.close()
}

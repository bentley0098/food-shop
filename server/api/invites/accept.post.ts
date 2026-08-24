import { serverSupabaseClient } from '#supabase/server'

/**
 * Thin wrapper over the accept_household_invite() RPC (PLAN.md §0.5). The
 * generic failure message is the RPC's, preserved as-is — distinguishing
 * invalid/expired/already-accepted tells an attacker which guesses were
 * close (SPEC.md §3).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ code?: string }>(event)
  const code = body?.code?.trim()

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'An invite code is required' })
  }

  // TODO: drop the `any` once shared/types/database.ts has real generated
  // types wired into nuxt.config.ts's `supabase.types`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = await serverSupabaseClient<any>(event)
  const { data, error } = await client.rpc('accept_household_invite', { p_code: code })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: "That code isn't valid" })
  }

  return data
})

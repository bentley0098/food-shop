import { serverSupabaseClient } from '#supabase/server'

/**
 * Thin wrapper over the create_household_invite() RPC (PLAN.md §0.5).
 * Uses the user-scoped client, not the service role — household_id comes
 * from the caller's session inside the RPC, never from the request
 * (INFRASTRUCTURE.md §5.3).
 */
export default defineEventHandler(async (event) => {
  // TODO: drop the `any` once shared/types/database.ts has real generated
  // types wired into nuxt.config.ts's `supabase.types`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = await serverSupabaseClient<any>(event)
  const { data, error } = await client.rpc('create_household_invite')

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return data
})

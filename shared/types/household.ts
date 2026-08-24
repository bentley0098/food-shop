// Hand-written until `shared/types/database.ts` can be regenerated against a
// running local Supabase instance (needs Docker — see INFRASTRUCTURE.md §4).
// Shape matches the profiles/households migrations exactly; swap to
// `Database['public']['Tables'][...]['Row']` once generated types land.
export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  household_id: string | null
  created_at: string
}

export interface Household {
  id: string
  name: string
  portion_size: number
  created_by: string | null
  created_at: string
}

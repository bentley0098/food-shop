// Generated. Regenerate whenever a migration lands (PLAN.md's standing rule)
// with local Supabase running:
//
//   supabase gen types typescript --local > shared/types/database.ts
//
// Not yet wired into nuxt.config.ts's `supabase.types` — see the comment
// there. This placeholder exists for the eventual real path and for any
// code that wants to import `Database` directly ahead of that.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

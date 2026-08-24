/**
 * The single helper every household read goes through (SPEC.md §2,
 * PLAN.md §0.4). Never query `profiles`/`households` directly from a
 * component — go through this, so the later many-to-many households
 * migration (`household_members` replacing `profiles.household_id`) stays a
 * one-file change.
 */
export function useHousehold() {
  return useHouseholdStore()
}

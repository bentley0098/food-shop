-- Leaving a household clears profiles.household_id, which is not
-- client-writable (SPEC.md §3) — so, like create_household() and
-- accept_household_invite(), this needs its own SECURITY DEFINER RPC.
-- Needed for /settings/household.vue's "Leave household" action
-- (DESIGN.md §5.13), not explicitly named in PLAN.md's migration list but
-- following the same pattern for the same reason. See DECISIONS.md.
create function public.leave_household() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles set household_id = null where id = v_uid;
end;
$$;

revoke all on function public.leave_household() from public;
grant execute on function public.leave_household() to authenticated;

-- profiles + the auth_household_id() helper (SPEC.md §2, §3).
--
-- profiles.household_id references households(id), but households is
-- created in the next migration to avoid a circular table dependency —
-- the FK constraint is added there once households exists (INFRASTRUCTURE.md
-- §6.2's expand pattern, applied within a single Phase 0 rather than across
-- deploys since nothing has shipped yet).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  household_id uuid,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER is load-bearing: a policy *on* profiles calls this
-- function, and only because the function bypasses RLS for its own duration
-- does that not recurse. Wrapped in a scalar subquery at every call site so
-- Postgres hoists it into an InitPlan instead of re-evaluating per row
-- (DECISIONS.md A4).
create function public.auth_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;

create policy "profiles are visible to self and household-mates"
  on public.profiles for select
  using (id = auth.uid() or household_id = (select public.auth_household_id()));

create policy "profiles are editable only by self"
  on public.profiles for update
  using (id = auth.uid());

-- household_id is not client-writable at all (SPEC.md §3, DECISIONS.md A4):
-- allowing it would let a user join any household by guessing a uuid. RLS
-- alone can't express a column-level restriction, so it's enforced by
-- narrowing the UPDATE grant itself. household_id is set only by the trigger
-- below and by the SECURITY DEFINER RPCs in the next migration, all of which
-- run as the function owner and are unaffected by this grant.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- No insert/delete policy: rows are created by the trigger below and removed
-- by the cascade from auth.users.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

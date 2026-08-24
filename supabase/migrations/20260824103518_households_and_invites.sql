-- households, household_invites, and the two SECURITY DEFINER RPCs that are
-- the only way household_id or an invite ever gets written (SPEC.md §2, §3;
-- DECISIONS.md C1, C4).

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  portion_size smallint not null default 2 check (portion_size >= 1),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

create policy "household members can select their household"
  on public.households for select
  using (id = (select public.auth_household_id()));

create policy "household members can update their household"
  on public.households for update
  using (id = (select public.auth_household_id()));

-- No insert/delete policy: households are created only by create_household()
-- below and never deleted by the client in v1.

-- Table privileges aren't granted by default (DECISIONS.md, see the same
-- note in the profiles migration) — RLS alone doesn't let a role query a
-- table at all without this.
grant select, update on public.households to authenticated;

-- Now that households exists, wire up the FK deferred from the profiles
-- migration (SPEC.md §2: "profiles.household_id | on delete set null |
-- deleting a household orphans its members rather than deleting them").
alter table public.profiles
  add constraint profiles_household_id_fkey
  foreign key (household_id) references public.households (id) on delete set null;

-- Invite codes: the app's only trust boundary (SPEC.md §3, DECISIONS.md C4).
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '72 hours'),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index household_invites_household_id_unaccepted_idx
  on public.household_invites (household_id)
  where accepted_at is null;

alter table public.household_invites enable row level security;
-- Deliberately zero policies: never exposed to the client directly (SPEC.md
-- §3). RLS enabled with no policy is default-deny for every role except the
-- table owner, which is exactly what "joining goes only through the RPC"
-- requires. The SELECT grant below is what makes that a *policy* decision
-- rather than a blanket permission error — without it the client can't
-- query the table at all, policy or not, which still reads as "never
-- exposed" but for the wrong reason.
grant select on public.household_invites to authenticated;

-- Rate-limit bookkeeping for accept_household_invite(). Also never exposed
-- to the client — written only from inside that function.
create table public.household_invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index household_invite_attempts_user_recent_idx
  on public.household_invite_attempts (user_id, attempted_at);

alter table public.household_invite_attempts enable row level security;

-- Crockford base32 (0-9A-Z less I, L, O, U): unambiguous read aloud or typed
-- off a screen. CSPRNG via gen_random_bytes, never random(). 256 % 32 = 0,
-- so `byte % 32` over a uniform byte is itself uniform — no modulo bias.
create function public.generate_invite_code() returns text
language plpgsql as $$
declare
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result text := '';
  raw_bytes bytea := gen_random_bytes(10);
  i int;
begin
  for i in 0..9 loop
    result := result || substr(alphabet, (get_byte(raw_bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- Household creation is the one household_id write not explicitly named in
-- SPEC.md's "set by the trigger on signup and by accept_household_invite"
-- sentence — SPEC covers signup and join, not create. Implemented the same
-- way for consistency: a SECURITY DEFINER RPC is the only path, so
-- household_id stays unwritable by any other client call. See DECISIONS.md.
create function public.create_household(p_name text) returns public.households
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_household public.households;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    raise exception 'Already in a household';
  end if;

  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Household name is required';
  end if;

  insert into public.households (name, created_by)
  values (trim(p_name), v_uid)
  returning * into v_household;

  update public.profiles set household_id = v_household.id where id = v_uid;

  return v_household;
end;
$$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

create function public.create_household_invite() returns public.household_invites
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
  v_code text;
  v_invite public.household_invites;
begin
  select household_id into v_household_id from public.profiles where id = v_uid;
  if v_household_id is null then
    raise exception 'Not in a household';
  end if;

  -- Regeneration invalidates any outstanding unaccepted codes (SPEC.md §3).
  delete from public.household_invites
    where household_id = v_household_id and accepted_at is null;

  loop
    v_code := public.generate_invite_code();
    begin
      insert into public.household_invites (household_id, code, created_by)
      values (v_household_id, v_code, v_uid)
      returning * into v_invite;
      exit;
    exception when unique_violation then
      -- Code collision — retry with a freshly generated one.
    end;
  end loop;

  return v_invite;
end;
$$;

revoke all on function public.create_household_invite() from public;
grant execute on function public.create_household_invite() to authenticated;

create function public.accept_household_invite(p_code text) returns public.households
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_recent_attempts int;
  v_invite public.household_invites;
  v_household public.households;
  v_normalized_code text := upper(trim(coalesce(p_code, '')));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    raise exception 'Already in a household';
  end if;

  select count(*) into v_recent_attempts
    from public.household_invite_attempts
    where user_id = v_uid and attempted_at > now() - interval '1 hour';
  if v_recent_attempts >= 10 then
    raise exception 'Too many attempts — try again later';
  end if;

  insert into public.household_invite_attempts (user_id) values (v_uid);

  select * into v_invite
    from public.household_invites
    where code = v_normalized_code
    for update;

  -- Generic failure message for not-found, already-accepted, and expired —
  -- distinguishing them tells an attacker which guesses were close.
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.expires_at < now() then
    raise exception 'That code isn''t valid';
  end if;

  update public.household_invites
    set accepted_by = v_uid, accepted_at = now()
    where id = v_invite.id;

  update public.profiles set household_id = v_invite.household_id where id = v_uid;

  -- portion_size is seeded from the member count on create and on join, then
  -- left alone — it is never recomputed after this (DECISIONS.md C1).
  update public.households
    set portion_size = (
      select count(*) from public.profiles where household_id = v_invite.household_id
    )
    where id = v_invite.household_id;

  select * into v_household from public.households where id = v_invite.household_id;
  return v_household;
end;
$$;

revoke all on function public.accept_household_invite(text) from public;
grant execute on function public.accept_household_invite(text) to authenticated;

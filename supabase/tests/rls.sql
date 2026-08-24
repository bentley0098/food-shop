-- Cross-household RLS isolation (SPEC.md §3, §9; PLAN.md's standing rule:
-- "every table added is added to the RLS isolation test in the same PR").
--
-- Run via `supabase test db`. Extended in each later phase's migration PR
-- as new household tables land.
--
-- IMPORTANT — this file only proves the *positive* case (policies pass when
-- correct). It is only trustworthy once you've also proven the *negative*
-- case by hand: temporarily comment out one policy below, re-run, and watch
-- this suite fail red. Do that once, then restore the policy. SPEC.md §3.

begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- Fixtures: two users, each the sole member of their own household.
-- Inserted as the migration-running role, which owns these tables and so
-- bypasses RLS for setup — exactly the same reason SECURITY DEFINER
-- functions can write profiles.household_id.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@fixture.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@fixture.test');

insert into public.households (id, name, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Household A', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Household B', '22222222-2222-2222-2222-222222222222');

update public.profiles set household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  where id = '22222222-2222-2222-2222-222222222222';

insert into public.household_invites (household_id, code, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TESTCODE1', '11111111-1111-1111-1111-111111111111');

-- Impersonate Alice (household A) the way PostgREST does: `authenticated`
-- role plus a JWT `sub` claim, which auth.uid() reads.
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.households where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0,
  'user in household A cannot read household B''s households row'
);

select is(
  (select count(*)::int from public.households where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'user in household A can read their own household row'
);

select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'user in household A cannot read household B''s profile'
);

select is(
  (select count(*)::int from public.profiles where household_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'user can read their own household-mates'' profiles'
);

select is(
  (select count(*)::int from public.household_invites),
  0,
  'household_invites is never selectable by an authenticated client, even for its own household'
);

select throws_ok(
  $$ update public.profiles set household_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'a client cannot write its own profiles.household_id'
);

select * from finish();
rollback;

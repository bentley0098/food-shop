-- Same idempotent backfill as 20260824162459 — a profiles row was manually
-- deleted from the dashboard during testing. Re-running as a new migration
-- rather than editing the old one (forward-only, PLAN.md's standing rule).
-- Safe to run any number of times: only inserts rows genuinely missing.
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- One-time backfill: any auth.users row that predates the
-- on_auth_user_created trigger (this project's very first sign-ins,
-- before the profiles/households migration was pushed) has no matching
-- profiles row. households.created_by (and every other FK to profiles)
-- then fails on that user's first write. Idempotent — safe to re-run.
insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

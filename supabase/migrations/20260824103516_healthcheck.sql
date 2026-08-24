-- Deliberately not a household table and deliberately holding nothing.
-- The keepalive cron (INFRASTRUCTURE.md §3.3) needs no privileges to ping it,
-- and if a workflow log ever echoes the response it leaks a single timestamp.
create table public.healthcheck (
  id smallint primary key default 1,
  checked_at timestamptz not null default now()
);

insert into public.healthcheck (id) values (1) on conflict do nothing;

alter table public.healthcheck enable row level security;

create policy "healthcheck is readable by anyone"
  on public.healthcheck for select
  using (true);

-- Table privileges aren't granted by default — the keepalive cron hits this
-- with the anon key, unauthenticated, so anon needs the grant too, not just
-- authenticated (DECISIONS.md; see the same note in the profiles migration).
grant select on public.healthcheck to anon, authenticated;

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

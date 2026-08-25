-- Manual penalty events: the only human-entered data in the system.
-- Penalty scored/won player names are not exposed by the FPL API.

create table if not exists public.manual_penalty_events (
  id          uuid primary key default gen_random_uuid(),
  gameweek    integer not null check (gameweek between 1 and 38),
  player_name text    not null,
  event_type  text    not null check (event_type in ('Penalty Scored','Penalty Won','Penalty Missed','Penalty Saved')),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id)
);

create index if not exists idx_penalty_events_gw
  on public.manual_penalty_events (gameweek);

alter table public.manual_penalty_events enable row level security;

-- Authenticated admin(s) may do everything. The pipeline uses the
-- service-role key, which bypasses RLS entirely.
create policy "authenticated full access"
  on public.manual_penalty_events
  for all
  to authenticated
  using (true)
  with check (true);

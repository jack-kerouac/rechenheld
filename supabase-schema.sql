-- Rechenheld database schema
-- Run this in your Supabase SQL editor

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references players(id),
  opponent_id uuid references players(id),
  number_range int not null,
  calculations jsonb not null,
  created_at timestamptz not null default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  number_range int not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  correct_count int,
  calculations jsonb not null,
  battle_id uuid references battles(id),
  created_at timestamptz not null default now()
);

create view leaderboard as
select
  p.id as player_id, p.name, r.number_range,
  count(*) as rounds_played,
  min(r.finished_at - r.started_at) as best_time,
  avg(r.correct_count) as avg_score
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null and r.correct_count = 10 and r.battle_id is null
group by p.id, p.name, r.number_range;

-- RLS: permissive for classroom use (no auth)
alter table players enable row level security;
alter table battles enable row level security;
alter table rounds enable row level security;

create policy "Anyone can read players" on players for select using (true);
create policy "Anyone can insert players" on players for insert with check (true);

create policy "Anyone can read battles" on battles for select using (true);
create policy "Anyone can insert battles" on battles for insert with check (true);

create policy "Anyone can read rounds" on rounds for select using (true);
create policy "Anyone can insert rounds" on rounds for insert with check (true);

-- Enable Realtime for battles and rounds
alter publication supabase_realtime add table battles;
alter publication supabase_realtime add table rounds;

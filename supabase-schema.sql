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
  stufe int not null check (stufe between 1 and 3),
  calculations jsonb not null,
  created_at timestamptz not null default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  stufe int not null check (stufe between 1 and 3),
  started_at timestamptz not null,
  finished_at timestamptz,
  correct_count int,
  calculations jsonb not null,
  battle_id uuid references battles(id),
  created_at timestamptz not null default now()
);

create view speed_leaderboard as
select distinct on (p.id, r.stufe)
  p.id as player_id, p.name, r.stufe,
  (r.finished_at - r.started_at) as best_time,
  r.finished_at as best_date
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null
  and r.correct_count = 10
  and r.battle_id is null
  and r.started_at >= date_trunc('week', now())
order by p.id, r.stufe, (r.finished_at - r.started_at) asc;

create view practice_leaderboard as
select
  p.id as player_id,
  p.name,
  r.stufe,
  count(*) as rounds_count
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null
  and r.correct_count >= 6
  and r.started_at >= date_trunc('week', now())
group by p.id, p.name, r.stufe
order by rounds_count desc;

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

create view speed_leaderboard_prev_week as
select distinct on (p.id, r.stufe)
  p.id as player_id, p.name, r.stufe,
  (r.finished_at - r.started_at) as best_time,
  r.finished_at as best_date
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null
  and r.correct_count = 10
  and r.battle_id is null
  and r.started_at >= date_trunc('week', now() - interval '1 week')
  and r.started_at < date_trunc('week', now())
order by p.id, r.stufe, (r.finished_at - r.started_at) asc;

create view practice_leaderboard_prev_week as
select
  p.id as player_id,
  p.name,
  r.stufe,
  count(*) as rounds_count
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null
  and r.correct_count >= 6
  and r.started_at >= date_trunc('week', now() - interval '1 week')
  and r.started_at < date_trunc('week', now())
group by p.id, p.name, r.stufe
order by rounds_count desc;

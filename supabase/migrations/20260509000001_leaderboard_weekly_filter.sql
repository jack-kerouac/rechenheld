drop view leaderboard;

create view leaderboard as
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

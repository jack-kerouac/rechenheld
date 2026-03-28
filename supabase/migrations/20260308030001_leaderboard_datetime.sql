-- Change best_date from date to full timestamp so the leaderboard can show time of day
drop view leaderboard;

create view leaderboard as
select distinct on (p.id, r.number_range, r.op_mode)
  p.id as player_id, p.name, r.number_range, r.op_mode,
  (r.finished_at - r.started_at) as best_time,
  r.finished_at as best_date
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null and r.correct_count = 10 and r.battle_id is null
order by p.id, r.number_range, r.op_mode, (r.finished_at - r.started_at) asc;

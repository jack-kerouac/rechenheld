-- Add op_mode column to battles and rounds
alter table battles add column op_mode text not null default 'plus-minus';
alter table rounds add column op_mode text not null default 'plus-minus';

-- Recreate leaderboard view to include op_mode
drop view leaderboard;

create view leaderboard as
select
  p.id as player_id, p.name, r.number_range, r.op_mode,
  count(*) as rounds_played,
  min(r.finished_at - r.started_at) as best_time,
  avg(r.correct_count) as avg_score
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null and r.correct_count = 10 and r.battle_id is null
group by p.id, p.name, r.number_range, r.op_mode;

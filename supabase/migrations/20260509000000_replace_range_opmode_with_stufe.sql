-- Replace number_range + op_mode with a single stufe column (1/2/3)
--
-- Mapping:
--   (10, plus)       → stufe 1  (Addition bis 10)
--   (10, plus-minus) → stufe 2  (+ und − bis 10)
--   (20, plus-minus) → stufe 3  (+ und − bis 20)
--   (20, plus)       → DROP (no mapping)
--   (30, *)          → DROP (no mapping)

-- Drop the view first so we can alter the underlying columns
drop view leaderboard;

-- Remove unmappable rows (rounds before battles because of FK)
delete from rounds where (number_range = 20 and op_mode = 'plus') or number_range = 30;
delete from battles where (number_range = 20 and op_mode = 'plus') or number_range = 30;

-- Add stufe column (nullable until populated)
alter table rounds add column stufe int check (stufe between 1 and 3);
alter table battles add column stufe int check (stufe between 1 and 3);

-- Populate from old columns
update rounds set stufe = case
  when number_range = 10 and op_mode = 'plus'       then 1
  when number_range = 10 and op_mode = 'plus-minus'  then 2
  when number_range = 20 and op_mode = 'plus-minus'  then 3
end;

update battles set stufe = case
  when number_range = 10 and op_mode = 'plus'       then 1
  when number_range = 10 and op_mode = 'plus-minus'  then 2
  when number_range = 20 and op_mode = 'plus-minus'  then 3
end;

-- Enforce not-null and drop old columns
alter table rounds alter column stufe set not null;
alter table rounds drop column number_range;
alter table rounds drop column op_mode;

alter table battles alter column stufe set not null;
alter table battles drop column number_range;
alter table battles drop column op_mode;

-- Recreate leaderboard view grouped by stufe
create view leaderboard as
select distinct on (p.id, r.stufe)
  p.id as player_id, p.name, r.stufe,
  (r.finished_at - r.started_at) as best_time,
  r.finished_at as best_date
from players p
join rounds r on r.player_id = p.id
where r.finished_at is not null and r.correct_count = 10 and r.battle_id is null
order by p.id, r.stufe, (r.finished_at - r.started_at) asc;

export type Op = "+" | "-";

export type OpMode = "plus" | "plus-minus";

export type Calculation = {
  a: number;
  b: number;
  op: Op;
  answer: number;
};

export type CalculationWithInput = Calculation & {
  playerAnswer?: number;
};

export type Player = {
  id: string;
  name: string;
};

export type Round = {
  id: string;
  player_id: string;
  number_range: number;
  op_mode: OpMode;
  started_at: string;
  finished_at: string | null;
  correct_count: number | null;
  calculations: CalculationWithInput[];
  battle_id: string | null;
};

export type Battle = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  number_range: number;
  op_mode: OpMode;
  calculations: Calculation[];
  created_at: string;
};

export type LeaderboardEntry = {
  player_id: string;
  name: string;
  number_range: number;
  op_mode: OpMode;
  best_time: string;
  best_date: string;
};

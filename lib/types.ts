export type Op = "+" | "-";

export type Stufe = 1 | 2 | 3;

export const STUFE_LABELS: Record<Stufe, string> = {
  1: "Addition bis 10",
  2: "+ und − bis 10",
  3: "+ und − bis 20",
};

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
  stufe: Stufe;
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
  stufe: Stufe;
  calculations: Calculation[];
  created_at: string;
};

export type LeaderboardEntry = {
  player_id: string;
  name: string;
  stufe: Stufe;
  best_time: string;
  best_date: string;
};

export type PracticeLeaderboardEntry = {
  player_id: string;
  name: string;
  stufe: Stufe;
  rounds_count: number;
};

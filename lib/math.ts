import { Calculation, Op, OpMode } from "./types";

export function generateCalculations(
  range: number,
  count: number,
  opMode: OpMode = "plus-minus"
): Calculation[] {
  const pool = buildPool(range, opMode);
  shuffle(pool);
  return pool.slice(0, count);
}

function buildPool(range: number, opMode: OpMode): Calculation[] {
  const pool: Calculation[] = [];

  if (opMode === "plus" || opMode === "plus-minus") {
    for (let a = 0; a <= range; a++) {
      for (let b = 0; b <= range - a; b++) {
        pool.push({ a, b, op: "+", answer: a + b });
      }
    }
  }

  if (opMode === "plus-minus") {
    for (let a = 0; a <= range; a++) {
      for (let b = 0; b <= a; b++) {
        pool.push({ a, b, op: "-", answer: a - b });
      }
    }
  }

  return pool;
}

function shuffle(arr: unknown[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

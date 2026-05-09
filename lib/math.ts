import { Calculation } from "./types";

export function generateCalculations(
  stufe: 1 | 2 | 3,
  count: number
): Calculation[] {
  const pool = buildPool(stufe);
  shuffle(pool);
  return pool.slice(0, count);
}

function buildPool(stufe: 1 | 2 | 3): Calculation[] {
  const pool: Calculation[] = [];
  const range = stufe <= 2 ? 10 : 20;

  for (let a = 0; a <= range; a++) {
    for (let b = 0; b <= range - a; b++) {
      pool.push({ a, b, op: "+", answer: a + b });
    }
  }

  if (stufe >= 2) {
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

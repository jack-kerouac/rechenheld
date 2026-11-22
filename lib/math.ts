import { Calculation } from "./types";

export function generateCalculations(
  stufe: 1 | 2 | 3,
  count: number
): Calculation[] {
  const pool = buildPool(stufe);
  shuffle(pool);
  // Problems with a 0 operand are trivial and make up ~1/3 of the pool; allow at most one per round.
  const firstZero = pool.find(hasZeroOperand);
  return pool
    .filter((c) => c === firstZero || !hasZeroOperand(c))
    .slice(0, count);
}

function hasZeroOperand(c: Calculation): boolean {
  return c.a === 0 || c.b === 0;
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

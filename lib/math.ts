import { Calculation, Op, OpMode } from "./types";

export function generateCalculations(
  range: number,
  count: number,
  opMode: OpMode = "plus-minus"
): Calculation[] {
  const calculations: Calculation[] = [];

  for (let i = 0; i < count; i++) {
    calculations.push(generateOneCalculation(range, opMode));
  }

  return calculations;
}

function generateOneCalculation(range: number, opMode: OpMode): Calculation {
  const op: Op = opMode === "plus" ? "+" : Math.random() < 0.5 ? "+" : "-";

  if (op === "+") {
    // a + b = answer, where answer <= range, a >= 0, b >= 0
    const answer = randomInt(0, range);
    const a = randomInt(0, answer);
    const b = answer - a;
    return { a, b, op, answer };
  } else {
    // a - b = answer, where a <= range, answer >= 0
    const a = randomInt(0, range);
    const b = randomInt(0, a);
    const answer = a - b;
    return { a, b, op, answer };
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

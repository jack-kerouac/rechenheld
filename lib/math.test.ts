import { describe, it, expect } from "vitest";
import { generateCalculations } from "./math";

describe("generateCalculations", () => {
  it("generates the requested number of calculations", () => {
    const calcs = generateCalculations(1, 10);
    expect(calcs).toHaveLength(10);
  });

  it("stufe 1: only addition, values and answers ≤ 10", () => {
    const calcs = generateCalculations(1, 200);
    for (const c of calcs) {
      expect(c.op).toBe("+");
      expect(c.a).toBeGreaterThanOrEqual(0);
      expect(c.a).toBeLessThanOrEqual(10);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(10);
      expect(c.answer).toBeGreaterThanOrEqual(0);
      expect(c.answer).toBeLessThanOrEqual(10);
    }
  });

  it("stufe 2: both operators, values and answers ≤ 10", () => {
    const calcs = generateCalculations(2, 200);
    const ops = new Set(calcs.map((c) => c.op));
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
    for (const c of calcs) {
      expect(c.a).toBeGreaterThanOrEqual(0);
      expect(c.a).toBeLessThanOrEqual(10);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(10);
      expect(c.answer).toBeGreaterThanOrEqual(0);
      expect(c.answer).toBeLessThanOrEqual(10);
    }
  });

  it("stufe 3: both operators, values and answers ≤ 20", () => {
    const calcs = generateCalculations(3, 200);
    const ops = new Set(calcs.map((c) => c.op));
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
    for (const c of calcs) {
      expect(c.a).toBeGreaterThanOrEqual(0);
      expect(c.a).toBeLessThanOrEqual(20);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(20);
      expect(c.answer).toBeGreaterThanOrEqual(0);
      expect(c.answer).toBeLessThanOrEqual(20);
    }
  });

  it("no results are negative", () => {
    for (const stufe of [1, 2, 3] as const) {
      const calcs = generateCalculations(stufe, 200);
      for (const c of calcs) {
        expect(c.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("answers are correct", () => {
    for (const stufe of [1, 2, 3] as const) {
      const calcs = generateCalculations(stufe, 100);
      for (const c of calcs) {
        if (c.op === "+") {
          expect(c.answer).toBe(c.a + c.b);
        } else {
          expect(c.answer).toBe(c.a - c.b);
        }
      }
    }
  });
});

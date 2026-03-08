import { describe, it, expect } from "vitest";
import { generateCalculations } from "./math";

describe("generateCalculations", () => {
  it("generates the requested number of calculations", () => {
    const calcs = generateCalculations(10, 10);
    expect(calcs).toHaveLength(10);
  });

  it("only uses + and - operators", () => {
    const calcs = generateCalculations(20, 100);
    for (const c of calcs) {
      expect(["+", "-"]).toContain(c.op);
    }
  });

  it("all values and results are within [0, range]", () => {
    for (const range of [10, 20, 30]) {
      const calcs = generateCalculations(range, 200);
      for (const c of calcs) {
        expect(c.a).toBeGreaterThanOrEqual(0);
        expect(c.a).toBeLessThanOrEqual(range);
        expect(c.b).toBeGreaterThanOrEqual(0);
        expect(c.b).toBeLessThanOrEqual(range);
        expect(c.answer).toBeGreaterThanOrEqual(0);
        expect(c.answer).toBeLessThanOrEqual(range);
      }
    }
  });

  it("no results are negative", () => {
    const calcs = generateCalculations(10, 500);
    for (const c of calcs) {
      expect(c.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("answers are correct", () => {
    const calcs = generateCalculations(20, 100);
    for (const c of calcs) {
      if (c.op === "+") {
        expect(c.answer).toBe(c.a + c.b);
      } else {
        expect(c.answer).toBe(c.a - c.b);
      }
    }
  });

  it("generates both addition and subtraction", () => {
    const calcs = generateCalculations(20, 200);
    const ops = new Set(calcs.map((c) => c.op));
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
  });

  it("works with range 0", () => {
    const calcs = generateCalculations(0, 5);
    for (const c of calcs) {
      expect(c.a).toBe(0);
      expect(c.b).toBe(0);
      expect(c.answer).toBe(0);
    }
  });

  it("plus mode generates only addition", () => {
    const calcs = generateCalculations(20, 200, "plus");
    for (const c of calcs) {
      expect(c.op).toBe("+");
    }
  });

  it("plus-minus mode generates both operators", () => {
    const calcs = generateCalculations(20, 200, "plus-minus");
    const ops = new Set(calcs.map((c) => c.op));
    expect(ops.has("+")).toBe(true);
    expect(ops.has("-")).toBe(true);
  });
});

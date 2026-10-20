import { describe, expect, it } from "vitest";
import { type SimulationInput, simulate } from "@/lib/finance/simulator";

const base: SimulationInput = {
  startMonth: "2026-04",
  months: 6,
  startBalance: 100000n,
  baseIncome: 200000n,
  baseExpense: 180000n,
  incomeChangeBp: 0n,
  expenseChangeBp: 0n,
  incomeChangeCents: 0n,
  expenseChangeCents: 0n,
  extraSavingCents: 0n,
  purchase: null,
  goal: null,
  minimumReserve: 0n,
  currency: "EUR",
};

describe("simulador", () => {
  it("sin cambios, el escenario coincide con la base", () => {
    const r = simulate(base);
    expect(r.points).toHaveLength(6);
    expect(r.baseEnd).toBe(220000n);
    expect(r.scenarioEnd).toBe(r.baseEnd);
    expect(r.points[0]?.month).toBe("2026-04");
    expect(r.points[5]?.month).toBe("2026-09");
  });

  it("aplica cambios porcentuales y fijos y el ahorro adicional", () => {
    const r = simulate({ ...base, incomeChangeBp: -1000n, expenseChangeBp: 500n, expenseChangeCents: 2000n, extraSavingCents: 5000n });
    expect(r.scenarioIncome).toBe(180000n); // −10 %
    expect(r.scenarioExpense).toBe(186000n); // 1800 + 5 % + 20 − 50
    expect(r.scenarioNet).toBe(-6000n);
  });

  it("detecta saldos negativos tras una compra", () => {
    const r = simulate({ ...base, purchase: { amount: 150000n, month: 2 }, minimumReserve: 20000n });
    expect(r.points[1]?.scenarioBalance).toBe(-10000n); // 1000 + 200 + 200 − 1500
    expect(r.firstNegative?.index).toBe(2);
    expect(r.firstBelowReserve?.index).toBe(2);
    expect(r.scenarioLowest?.index).toBe(2);
  });

  it("calcula los meses para alcanzar un objetivo", () => {
    const r = simulate({ ...base, goal: { target: 100000n, saved: 30000n }, extraSavingCents: 15000n });
    expect(r.goalMonthsBase).toBe(4); // 700 € / 200 € al mes
    expect(r.goalMonthsScenario).toBe(2); // 700 € / 350 € al mes
    const impossible = simulate({ ...base, baseExpense: 250000n, goal: { target: 100000n, saved: 0n } });
    expect(impossible.goalMonthsBase).toBeNull();
  });

  it("nunca deja ingresos o gastos negativos y limita el horizonte", () => {
    const r = simulate({ ...base, incomeChangeBp: -20000n, months: 99 });
    expect(r.scenarioIncome).toBe(0n);
    expect(r.points).toHaveLength(36);
  });
});

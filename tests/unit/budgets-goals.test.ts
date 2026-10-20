import { describe, expect, it } from "vitest";
import { budgetAlert, budgetUsage, explainBudget } from "@/lib/finance/budgets";
import { explainGoal, goalProgress, monthsBetween } from "@/lib/finance/goals";

describe("presupuestos", () => {
  it("calcula gastado, restante y porcentaje", () => {
    const u = budgetUsage(40000n, 10000n, 80, { month: "2026-03", today: "2026-04-02" });
    expect(u.remaining).toBe(30000n);
    expect(u.consumedBp).toBe(2500n);
    expect(u.status).toBe("ok");
    expect(u.projected).toBeNull(); // mes cerrado: sin previsión
  });

  it("avisa al llegar al umbral y al superarlo", () => {
    const warn = budgetUsage(40000n, 32000n, 80, { month: "2026-03", today: "2026-03-20" });
    expect(warn.status).toBe("warning");
    expect(budgetAlert("b1", "Comida", warn, 80, "EUR")?.severity).toBe("warning");
    const over = budgetUsage(40000n, 40001n, 80, { month: "2026-03", today: "2026-03-20" });
    expect(over.status).toBe("exceeded");
    expect(over.remaining).toBe(-1n);
    expect(budgetAlert("b1", "Comida", over, 80, "EUR")?.severity).toBe("danger");
  });

  it("proyecta el gasto a fin de mes solo a partir del día 5 del mes en curso", () => {
    const early = budgetUsage(30000n, 10000n, 80, { month: "2026-04", today: "2026-04-03" });
    expect(early.projected).toBeNull();
    const mid = budgetUsage(30000n, 10000n, 80, { month: "2026-04", today: "2026-04-10" });
    expect(mid.projected).toBe(30000n); // 100 € en 10 días → 300 € en 30 días
    const fast = budgetUsage(25000n, 10000n, 80, { month: "2026-04", today: "2026-04-10" });
    expect(budgetAlert("b2", "Ocio", fast, 80, "EUR")?.severity).toBe("info");
    expect(explainBudget("Ocio", fast, "2026-04", 80, "EUR").inputs.some((i) => i.label.includes("Previsión"))).toBe(true);
  });

  it("rechaza límites no positivos", () => {
    expect(() => budgetUsage(0n, 1n, 80, { month: "2026-04", today: "2026-04-10" })).toThrow();
  });
});

describe("objetivos de ahorro", () => {
  const base = { targetCents: 300000n, initialCents: 50000n, targetDate: null as string | null };

  it("suma aportaciones y resta retiradas", () => {
    const p = goalProgress(
      {
        ...base,
        movements: [
          { kind: "CONTRIBUTION", amountCents: 20000n, date: "2026-01-10" },
          { kind: "WITHDRAWAL", amountCents: 5000n, date: "2026-02-10" },
        ],
      },
      "2026-03-01",
    );
    expect(p.saved).toBe(65000n);
    expect(p.remaining).toBe(235000n);
    expect(p.progressBp).toBe(2167n);
    expect(p.reached).toBe(false);
  });

  it("calcula la aportación mensual necesaria redondeando al alza", () => {
    const p = goalProgress({ ...base, targetDate: "2026-12-15", movements: [] }, "2026-03-20");
    expect(monthsBetween("2026-03-20", "2026-12-15")).toBe(9);
    expect(p.monthsLeft).toBe(9);
    expect(p.requiredMonthly).toBe(27778n); // 2500 € / 9 = 277,777… → 277,78 €
  });

  it("estima la fecha al ritmo de los últimos 90 días", () => {
    const p = goalProgress(
      {
        ...base,
        movements: [
          { kind: "CONTRIBUTION", amountCents: 30000n, date: "2026-01-15" },
          { kind: "CONTRIBUTION", amountCents: 30000n, date: "2026-02-15" },
          { kind: "CONTRIBUTION", amountCents: 30000n, date: "2026-03-15" },
        ],
      },
      "2026-03-31",
    );
    expect(p.recentMonthlyRate).toBe(30000n);
    expect(p.remaining).toBe(160000n);
    expect(p.estimatedDate).toBe("2026-09-30"); // 6 meses
    expect(explainGoal({ ...base, movements: [] }, p, "EUR").isEstimate).toBe(true);
  });

  it("no estima fecha sin aportaciones recientes y marca objetivos alcanzados", () => {
    const none = goalProgress({ ...base, movements: [] }, "2026-03-31");
    expect(none.estimatedDate).toBeNull();
    const done = goalProgress({ ...base, initialCents: 400000n, movements: [] }, "2026-03-31");
    expect(done.reached).toBe(true);
    expect(done.progressBp).toBe(10000n);
    expect(done.requiredMonthly).toBeNull();
  });

  it("detecta una fecha objetivo ya pasada", () => {
    const p = goalProgress({ ...base, targetDate: "2026-01-01", movements: [] }, "2026-03-31");
    expect(p.targetDatePassed).toBe(true);
    expect(p.requiredMonthly).toBeNull();
  });
});

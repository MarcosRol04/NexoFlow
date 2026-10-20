import { describe, expect, it } from "vitest";
import { lowestPoint, projectBalance, safeToSpend } from "@/lib/finance/forecast";
import { type ScheduledRule, expandOccurrences, nextIncomeDate, occurrenceDates } from "@/lib/finance/schedule";

const rule = (r: Partial<ScheduledRule>): ScheduledRule => ({
  id: "r",
  type: "EXPENSE",
  amountCents: 1000n,
  description: "x",
  frequency: "MONTHLY",
  startDate: "2026-01-31",
  endDate: null,
  active: true,
  ...r,
});

describe("previsiones del calendario", () => {
  it("repite mensualmente ajustando al último día del mes", () => {
    expect(occurrenceDates(rule({}), "2026-01-01", "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("respeta las frecuencias semanal, trimestral, anual y única", () => {
    expect(occurrenceDates(rule({ frequency: "WEEKLY", startDate: "2026-03-02" }), "2026-03-10", "2026-03-31")).toEqual([
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
    ]);
    expect(occurrenceDates(rule({ frequency: "QUARTERLY", startDate: "2026-01-15" }), "2026-01-01", "2026-12-31")).toEqual([
      "2026-01-15",
      "2026-04-15",
      "2026-07-15",
      "2026-10-15",
    ]);
    expect(occurrenceDates(rule({ frequency: "YEARLY", startDate: "2024-02-29" }), "2025-01-01", "2028-12-31")).toEqual([
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
    expect(occurrenceDates(rule({ frequency: "ONCE", startDate: "2026-05-05" }), "2026-01-01", "2026-12-31")).toEqual(["2026-05-05"]);
  });

  it("respeta la fecha de fin y las previsiones desactivadas", () => {
    expect(occurrenceDates(rule({ endDate: "2026-02-28" }), "2026-01-01", "2026-12-31")).toEqual(["2026-01-31", "2026-02-28"]);
    expect(occurrenceDates(rule({ active: false }), "2026-01-01", "2026-12-31")).toEqual([]);
  });

  it("encuentra el próximo ingreso", () => {
    const rules = [rule({ id: "nomina", type: "INCOME", startDate: "2026-01-28" }), rule({ id: "alquiler", startDate: "2026-01-01" })];
    expect(nextIncomeDate(rules, "2026-03-28")).toBe("2026-04-28");
    expect(nextIncomeDate(rules, "2026-03-27")).toBe("2026-03-28");
    expect(expandOccurrences(rules, "2026-03-01", "2026-03-31").map((o) => o.itemId)).toEqual(["alquiler", "nomina"]);
  });
});

describe("previsión de saldo y dinero disponible", () => {
  const occ = (date: string, type: "INCOME" | "EXPENSE", amountCents: bigint) => ({ itemId: "i", date, type, amountCents, description: "" });

  it("proyecta el saldo día a día y encuentra el punto más bajo", () => {
    const points = projectBalance(10000n, [occ("2026-03-03", "EXPENSE", 15000n), occ("2026-03-05", "INCOME", 50000n)], "2026-03-01", "2026-03-06");
    expect(points).toHaveLength(6);
    expect(lowestPoint(points)).toEqual({ date: "2026-03-03", balance: -5000n });
    expect(points.at(-1)?.balance).toBe(45000n);
  });

  it("calcula el dinero disponible con la fórmula documentada", () => {
    const r = safeToSpend({
      today: "2026-03-20",
      horizonEnd: "2026-03-27",
      horizonLabel: "Hasta el próximo ingreso",
      currentBalance: 120000n,
      upcoming: [occ("2026-03-22", "EXPENSE", 30000n), occ("2026-03-25", "INCOME", 10000n), occ("2026-04-01", "EXPENSE", 99999n)],
      overdue: [occ("2026-03-18", "EXPENSE", 5000n), occ("2026-03-15", "INCOME", 7000n)],
      minimumReserve: 20000n,
      extraReserved: 10000n,
      hasAnyScheduledItem: true,
      currency: "EUR",
    });
    // 1200 + 100 − (300 + 50 vencido) − 200 − 100 = 650 €
    expect(r.available).toBe(65000n);
    expect(r.days).toBe(8);
    expect(r.perDay).toBe(8125n);
    expect(r.ignoredOverdueIncome).toBe(7000n);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.explanation.isEstimate).toBe(true);
  });

  it("avisa de un posible saldo inferior a la reserva mínima y de saldos negativos", () => {
    const r = safeToSpend({
      today: "2026-03-01",
      horizonEnd: "2026-03-31",
      horizonLabel: "Fin de mes",
      currentBalance: 30000n,
      upcoming: [occ("2026-03-02", "EXPENSE", 75000n), occ("2026-03-28", "INCOME", 200000n)],
      overdue: [],
      minimumReserve: 50000n,
      extraReserved: 0n,
      hasAnyScheduledItem: true,
      currency: "EUR",
    });
    expect(r.lowest?.balance).toBe(-45000n);
    expect(r.alerts[0]?.severity).toBe("danger");
    expect(r.available).toBe(105000n);
  });

  it("advierte cuando no hay previsiones y no da importe diario si no hay margen", () => {
    const r = safeToSpend({
      today: "2026-03-01",
      horizonEnd: "2026-03-07",
      horizonLabel: "7 días",
      currentBalance: 10000n,
      upcoming: [],
      overdue: [],
      minimumReserve: 20000n,
      extraReserved: 0n,
      hasAnyScheduledItem: false,
      currency: "EUR",
    });
    expect(r.available).toBe(-10000n);
    expect(r.perDay).toBeNull();
    expect(r.warnings.some((w) => w.includes("No tienes previsiones"))).toBe(true);
  });
});

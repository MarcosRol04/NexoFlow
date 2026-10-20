import { describe, expect, it } from "vitest";
import {
  type LedgerEntry,
  accountBalance,
  averageMonthlyExpense,
  balanceEffect,
  balanceFromSums,
  compareSpendingMonthToDate,
  expensesByCategory,
  explainPeriodSummary,
  monthlySeries,
  savingsRateBp,
  summarizePeriod,
  totalBalance,
} from "@/lib/finance/ledger";
import { monthRange } from "@/lib/finance/dates";

const A = "cuenta-a";
const B = "cuenta-b";

const entries: LedgerEntry[] = [
  { type: "INCOME", amountCents: 200000n, date: "2026-01-28", accountId: A, categoryId: "nomina" },
  { type: "EXPENSE", amountCents: 65000n, date: "2026-02-01", accountId: A, categoryId: "vivienda" },
  { type: "EXPENSE", amountCents: 12034n, date: "2026-02-03", accountId: A, categoryId: "comida" },
  { type: "EXPENSE", amountCents: 5000n, date: "2026-02-28", accountId: A, categoryId: "comida" },
  { type: "EXPENSE", amountCents: 999n, date: "2026-03-01", accountId: A, categoryId: null },
  // Transferencia de 300 € de A a B
  { type: "TRANSFER", transferLeg: "OUT", amountCents: 30000n, date: "2026-02-10", accountId: A },
  { type: "TRANSFER", transferLeg: "IN", amountCents: 30000n, date: "2026-02-10", accountId: B },
  { type: "INCOME", amountCents: 210000n, date: "2026-02-27", accountId: A, categoryId: "nomina" },
];

describe("saldos", () => {
  it("aplica el signo según el tipo de movimiento", () => {
    expect(balanceEffect({ type: "INCOME", amountCents: 100n, date: "2026-01-01", accountId: A })).toBe(100n);
    expect(balanceEffect({ type: "EXPENSE", amountCents: 100n, date: "2026-01-01", accountId: A })).toBe(-100n);
    expect(balanceEffect({ type: "TRANSFER", transferLeg: "OUT", amountCents: 100n, date: "2026-01-01", accountId: A })).toBe(-100n);
    expect(balanceEffect({ type: "TRANSFER", transferLeg: "IN", amountCents: 100n, date: "2026-01-01", accountId: A })).toBe(100n);
  });

  it("rechaza importes negativos y transferencias sin sentido", () => {
    expect(() => balanceEffect({ type: "INCOME", amountCents: -1n, date: "2026-01-01", accountId: A })).toThrow();
    expect(() => balanceEffect({ type: "TRANSFER", amountCents: 1n, date: "2026-01-01", accountId: A })).toThrow();
  });

  it("calcula el saldo de cada cuenta a partir del saldo inicial", () => {
    // A: 1000 + 2000 − 650 − 120,34 − 50 − 9,99 − 300 + 2100
    expect(accountBalance(100000n, entries, { accountId: A })).toBe(396967n);
    expect(accountBalance(0n, entries, { accountId: B })).toBe(30000n);
  });

  it("una transferencia no cambia el patrimonio total", () => {
    const transfer = entries.filter((e) => e.type === "TRANSFER");
    const total = totalBalance([accountBalance(0n, transfer, { accountId: A }), accountBalance(0n, transfer, { accountId: B })]);
    expect(total).toBe(0n);
  });

  it("calcula el saldo hasta una fecha", () => {
    expect(accountBalance(0n, entries, { accountId: A, upTo: "2026-01-31" })).toBe(200000n);
  });

  it("permite saldos negativos", () => {
    expect(accountBalance(1000n, [{ type: "EXPENSE", amountCents: 5000n, date: "2026-01-01", accountId: A }])).toBe(-4000n);
  });

  it("coincide con el cálculo a partir de sumas agregadas", () => {
    expect(balanceFromSums(100000n, { income: 410000n, expense: 83033n, transferIn: 0n, transferOut: 30000n })).toBe(396967n);
  });
});

describe("periodos", () => {
  it("suma ingresos y gastos del mes respetando los límites", () => {
    const feb = summarizePeriod(entries, monthRange("2026-02"));
    expect(feb.income).toBe(210000n);
    expect(feb.expense).toBe(82034n); // 650 + 120,34 + 50 (el gasto del 1 de marzo no entra)
    expect(feb.net).toBe(127966n);
    expect(feb.transferCount).toBe(2);
    expect(feb.expenseCount).toBe(3);
  });

  it("calcula la tasa de ahorro", () => {
    expect(savingsRateBp(200000n, 150000n)).toBe(2500n);
    expect(savingsRateBp(100000n, 150000n)).toBe(-5000n); // gastas más de lo que ingresas
  });

  it("no inventa una tasa de ahorro si no hay ingresos", () => {
    const march = summarizePeriod(entries, monthRange("2026-03"));
    expect(march.income).toBe(0n);
    expect(march.savingsRateBp).toBeNull();
    const exp = explainPeriodSummary(march, "EUR");
    expect(exp.assumptions.some((a) => a.includes("no se puede calcular"))).toBe(true);
    expect(exp.isEstimate).toBe(false);
  });

  it("agrupa gastos por categoría de mayor a menor", () => {
    const groups = expensesByCategory(entries, monthRange("2026-02"));
    expect(groups.map((g) => g.categoryId)).toEqual(["vivienda", "comida"]);
    expect(groups[1]?.total).toBe(17034n);
    expect(groups[1]?.count).toBe(2);
    const shares = groups.reduce((acc, g) => acc + (g.shareBp ?? 0n), 0n);
    expect(shares).toBe(10000n);
  });

  it("construye la serie mensual y la media de gasto", () => {
    const series = monthlySeries(entries, ["2026-01", "2026-02", "2026-03"]);
    expect(series.map((p) => p.expense)).toEqual([0n, 82034n, 999n]);
    expect(series[0]?.savingsRateBp).toBe(10000n);
    expect(averageMonthlyExpense(series)).toBe(27678n); // (0 + 82034 + 999) / 3 = 27677,67 → 27678
    expect(averageMonthlyExpense([])).toBeNull();
  });

  it("compara con el mismo tramo de días del mes anterior", () => {
    const cmp = compareSpendingMonthToDate(
      [
        { type: "EXPENSE", amountCents: 10000n, date: "2026-02-05", accountId: A },
        { type: "EXPENSE", amountCents: 99999n, date: "2026-02-20", accountId: A }, // fuera del tramo
        { type: "EXPENSE", amountCents: 15000n, date: "2026-03-08", accountId: A },
      ],
      "2026-03-10",
    );
    expect(cmp.previous.expense).toBe(10000n);
    expect(cmp.current.expense).toBe(15000n);
    expect(cmp.changeBp).toBe(5000n);
  });
});

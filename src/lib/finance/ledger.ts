// Cálculos sobre movimientos reales: saldos, totales por periodo, tasa de
// ahorro, gastos por categoría y evolución mensual.
//
// Son funciones puras (sin base de datos) para poder probarlas de forma aislada.
// Cada resultado incluye los datos y supuestos que ha usado (`Explanation`).

import { type DateRange, type IsoDate, type MonthKey, formatRange, inRange, monthRange, monthToDateRanges } from "./dates";
import { type Cents, divRound, formatBp, formatMoney, ratioBp } from "./money";

export type EntryType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransferLeg = "OUT" | "IN";

export interface LedgerEntry {
  type: EntryType;
  /** Solo en transferencias: OUT sale de la cuenta, IN entra. */
  transferLeg?: TransferLeg | null;
  /** Siempre positivo; el signo lo da el tipo. */
  amountCents: Cents;
  date: IsoDate;
  accountId: string;
  categoryId?: string | null;
}

export interface Explanation {
  /** Fórmula en lenguaje llano. */
  formula: string;
  /** Datos utilizados. */
  inputs: { label: string; value: string }[];
  /** Periodo considerado, si aplica. */
  period?: string;
  /** Supuestos y advertencias. */
  assumptions: string[];
  /** Si el resultado es una estimación (no un dato real). */
  isEstimate: boolean;
}

/** Efecto de un movimiento en el saldo de su cuenta. */
export function balanceEffect(entry: LedgerEntry): Cents {
  if (entry.amountCents < 0n) throw new RangeError("Los importes deben ser positivos");
  switch (entry.type) {
    case "INCOME":
      return entry.amountCents;
    case "EXPENSE":
      return -entry.amountCents;
    case "TRANSFER":
      if (entry.transferLeg === "IN") return entry.amountCents;
      if (entry.transferLeg === "OUT") return -entry.amountCents;
      throw new RangeError("Transferencia sin sentido (OUT/IN)");
  }
}

/** Saldo de una cuenta = saldo inicial + efecto de sus movimientos (opcionalmente hasta una fecha incluida). */
export function accountBalance(initialCents: Cents, entries: Iterable<LedgerEntry>, options: { accountId?: string; upTo?: IsoDate } = {}): Cents {
  let balance = initialCents;
  for (const e of entries) {
    if (options.accountId && e.accountId !== options.accountId) continue;
    if (options.upTo && e.date > options.upTo) continue;
    balance += balanceEffect(e);
  }
  return balance;
}

/** Sumas agregadas por la base de datos para una cuenta. */
export interface AccountSums {
  income: Cents;
  expense: Cents;
  transferIn: Cents;
  transferOut: Cents;
}

export const EMPTY_SUMS: AccountSums = { income: 0n, expense: 0n, transferIn: 0n, transferOut: 0n };

export function balanceFromSums(initialCents: Cents, sums: AccountSums): Cents {
  return initialCents + sums.income - sums.expense + sums.transferIn - sums.transferOut;
}

export function totalBalance(balances: Iterable<Cents>): Cents {
  let total = 0n;
  for (const b of balances) total += b;
  return total;
}

export interface PeriodSummary {
  range: DateRange;
  income: Cents;
  expense: Cents;
  /** Ingresos − gastos. */
  net: Cents;
  /** (ingresos − gastos) / ingresos en puntos básicos; null si no hay ingresos. */
  savingsRateBp: bigint | null;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
}

/** Totales de un periodo. Las transferencias entre cuentas propias NO son ingresos ni gastos. */
export function summarizePeriod(entries: Iterable<LedgerEntry>, range: DateRange): PeriodSummary {
  let income = 0n;
  let expense = 0n;
  let incomeCount = 0;
  let expenseCount = 0;
  let transferCount = 0;
  for (const e of entries) {
    if (!inRange(e.date, range)) continue;
    if (e.type === "INCOME") {
      income += e.amountCents;
      incomeCount += 1;
    } else if (e.type === "EXPENSE") {
      expense += e.amountCents;
      expenseCount += 1;
    } else {
      transferCount += 1;
    }
  }
  const net = income - expense;
  return {
    range,
    income,
    expense,
    net,
    savingsRateBp: savingsRateBp(income, expense),
    incomeCount,
    expenseCount,
    transferCount,
  };
}

/** Tasa de ahorro = (ingresos − gastos) / ingresos. Sin ingresos no está definida (null). */
export function savingsRateBp(income: Cents, expense: Cents): bigint | null {
  if (income <= 0n) return null;
  return ratioBp(income - expense, income);
}

export function explainPeriodSummary(summary: PeriodSummary, currency: string): Explanation {
  const assumptions = [
    "Las transferencias entre tus cuentas no cuentan como ingreso ni como gasto.",
    "Solo se incluyen movimientos registrados (no previsiones).",
  ];
  if (summary.savingsRateBp === null) {
    assumptions.push("No hay ingresos en el periodo: la tasa de ahorro no se puede calcular.");
  }
  if (summary.transferCount > 0) {
    assumptions.push(`Se han excluido ${summary.transferCount} movimientos de transferencia.`);
  }
  return {
    formula: "Balance = ingresos − gastos. Tasa de ahorro = balance ÷ ingresos.",
    inputs: [
      { label: `Ingresos (${summary.incomeCount} movimientos)`, value: formatMoney(summary.income, currency) },
      { label: `Gastos (${summary.expenseCount} movimientos)`, value: formatMoney(summary.expense, currency) },
      { label: "Balance", value: formatMoney(summary.net, currency) },
      { label: "Tasa de ahorro", value: formatBp(summary.savingsRateBp) },
    ],
    period: formatRange(summary.range),
    assumptions,
    isEstimate: false,
  };
}

export interface CategoryTotal {
  categoryId: string | null;
  total: Cents;
  count: number;
  /** Parte del total de gastos, en puntos básicos. */
  shareBp: bigint | null;
}

/** Gastos agrupados por categoría, de mayor a menor. `null` = sin categoría. */
export function expensesByCategory(entries: Iterable<LedgerEntry>, range: DateRange): CategoryTotal[] {
  const map = new Map<string | null, { total: Cents; count: number }>();
  let grand = 0n;
  for (const e of entries) {
    if (e.type !== "EXPENSE" || !inRange(e.date, range)) continue;
    const key = e.categoryId ?? null;
    const prev = map.get(key) ?? { total: 0n, count: 0 };
    map.set(key, { total: prev.total + e.amountCents, count: prev.count + 1 });
    grand += e.amountCents;
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, total: v.total, count: v.count, shareBp: ratioBp(v.total, grand) }))
    .sort((a, b) => (a.total === b.total ? 0 : a.total > b.total ? -1 : 1));
}

export interface MonthPoint {
  month: MonthKey;
  income: Cents;
  expense: Cents;
  net: Cents;
  savingsRateBp: bigint | null;
}

/** Ingresos, gastos y balance de cada mes indicado. */
export function monthlySeries(entries: Iterable<LedgerEntry>, months: MonthKey[]): MonthPoint[] {
  const list = [...entries];
  return months.map((month) => {
    const s = summarizePeriod(list, monthRange(month));
    return { month, income: s.income, expense: s.expense, net: s.net, savingsRateBp: s.savingsRateBp };
  });
}

/** Media de gasto mensual de una lista de meses (redondeada al céntimo). */
export function averageMonthlyExpense(points: MonthPoint[]): Cents | null {
  if (points.length === 0) return null;
  const total = points.reduce((acc, p) => acc + p.expense, 0n);
  return divRound(total, BigInt(points.length));
}

export interface SpendingComparison {
  current: { range: DateRange; expense: Cents };
  previous: { range: DateRange; expense: Cents };
  /** Variación relativa en pb; null si el periodo anterior no tiene gastos. */
  changeBp: bigint | null;
  days: number;
}

/** Gasto del mes en curso hasta hoy frente al mismo tramo de días del mes anterior. */
export function compareSpendingMonthToDate(entries: Iterable<LedgerEntry>, today: IsoDate): SpendingComparison {
  const list = [...entries];
  const ranges = monthToDateRanges(today);
  const current = summarizePeriod(list, ranges.current).expense;
  const previous = summarizePeriod(list, ranges.previous).expense;
  return {
    current: { range: ranges.current, expense: current },
    previous: { range: ranges.previous, expense: previous },
    changeBp: previous > 0n ? ratioBp(current - previous, previous) : null,
    days: ranges.days,
  };
}

// Previsión de saldo y «dinero disponible».
//
// Dinero disponible = saldo actual + ingresos previstos − gastos previstos
//                     − reserva mínima − cantidades apartadas
//
// Es una ESTIMACIÓN basada en lo que has registrado y previsto; no garantiza
// que puedas gastar esa cantidad.

import type { FinanceAlert } from "./alerts";
import { type IsoDate, addDays, diffDays, formatDate, formatRange } from "./dates";
import type { Explanation } from "./ledger";
import { type Cents, formatMoney } from "./money";
import type { Occurrence } from "./schedule";

export interface BalancePoint {
  date: IsoDate;
  balance: Cents;
}

/**
 * Saldo previsto día a día desde `from` hasta `to` (incluidos) aplicando las
 * previsiones en su fecha. Las que tengan fecha anterior a `from` se aplican el
 * primer día.
 */
export function projectBalance(start: Cents, occurrences: Occurrence[], from: IsoDate, to: IsoDate): BalancePoint[] {
  const byDate = new Map<IsoDate, Cents>();
  for (const o of occurrences) {
    const d = o.date < from ? from : o.date;
    if (d > to) continue;
    const delta = o.type === "INCOME" ? o.amountCents : -o.amountCents;
    byDate.set(d, (byDate.get(d) ?? 0n) + delta);
  }
  const points: BalancePoint[] = [];
  let balance = start;
  const days = diffDays(from, to);
  for (let i = 0; i <= days; i += 1) {
    const d = addDays(from, i);
    balance += byDate.get(d) ?? 0n;
    points.push({ date: d, balance });
  }
  return points;
}

export function lowestPoint(points: BalancePoint[]): BalancePoint | null {
  let min: BalancePoint | null = null;
  for (const p of points) if (!min || p.balance < min.balance) min = p;
  return min;
}

export interface SafeToSpendInput {
  today: IsoDate;
  /** Último día incluido en el horizonte. */
  horizonEnd: IsoDate;
  horizonLabel: string;
  currentBalance: Cents;
  /** Previsiones pendientes (sin registrar) entre hoy y el horizonte. */
  upcoming: Occurrence[];
  /** Previsiones vencidas sin registrar (antes de hoy). */
  overdue: Occurrence[];
  minimumReserve: Cents;
  extraReserved: Cents;
  hasAnyScheduledItem: boolean;
  currency: string;
}

export interface SafeToSpendResult {
  available: Cents;
  perDay: Cents | null;
  days: number;
  expectedIncome: Cents;
  expectedExpense: Cents;
  overdueExpense: Cents;
  ignoredOverdueIncome: Cents;
  points: BalancePoint[];
  lowest: BalancePoint | null;
  warnings: string[];
  alerts: FinanceAlert[];
  explanation: Explanation;
}

export function safeToSpend(input: SafeToSpendInput): SafeToSpendResult {
  const { currency } = input;
  const days = Math.max(1, diffDays(input.today, input.horizonEnd) + 1);
  const inHorizon = input.upcoming.filter((o) => o.date >= input.today && o.date <= input.horizonEnd);
  const expectedIncome = inHorizon.filter((o) => o.type === "INCOME").reduce((a, o) => a + o.amountCents, 0n);
  const plannedExpense = inHorizon.filter((o) => o.type === "EXPENSE").reduce((a, o) => a + o.amountCents, 0n);
  // Prudencia: los gastos vencidos sin registrar se cuentan como pendientes; los
  // ingresos vencidos sin registrar NO se cuentan (no se da por cobrado lo que no consta).
  const overdueExpense = input.overdue.filter((o) => o.type === "EXPENSE").reduce((a, o) => a + o.amountCents, 0n);
  const ignoredOverdueIncome = input.overdue.filter((o) => o.type === "INCOME").reduce((a, o) => a + o.amountCents, 0n);
  const expectedExpense = plannedExpense + overdueExpense;

  const available = input.currentBalance + expectedIncome - expectedExpense - input.minimumReserve - input.extraReserved;
  const perDay = available > 0n ? available / BigInt(days) : null;

  const points = projectBalance(
    input.currentBalance,
    [...inHorizon, ...input.overdue.filter((o) => o.type === "EXPENSE")],
    input.today,
    input.horizonEnd,
  );
  const lowest = lowestPoint(points);

  const warnings: string[] = [];
  if (!input.hasAnyScheduledItem) {
    warnings.push("No tienes previsiones en el calendario: el cálculo solo usa tu saldo actual y no tiene en cuenta pagos ni cobros futuros.");
  } else if (expectedIncome === 0n) {
    warnings.push("No hay ingresos previstos en este periodo.");
  }
  if (overdueExpense > 0n) {
    warnings.push(`Hay gastos previstos vencidos sin registrar por ${formatMoney(overdueExpense, currency)}; se cuentan como pendientes de pago.`);
  }
  if (ignoredOverdueIncome > 0n) {
    warnings.push(`Hay ingresos previstos vencidos sin registrar por ${formatMoney(ignoredOverdueIncome, currency)}; no se cuentan hasta que los registres.`);
  }
  if (input.currentBalance < 0n) warnings.push("Tu saldo total registrado es negativo.");
  if (available <= 0n) warnings.push("Con estos datos no queda margen para gastos adicionales en el periodo.");

  const alerts: FinanceAlert[] = [];
  if (input.minimumReserve > 0n && lowest && lowest.balance < input.minimumReserve) {
    alerts.push({
      id: "forecast-below-reserve",
      severity: lowest.balance < 0n ? "danger" : "warning",
      title: lowest.balance < 0n ? "Tu saldo podría quedar en negativo" : "Tu saldo podría bajar de la reserva mínima",
      detail: `Saldo previsto más bajo: ${formatMoney(lowest.balance, currency)} el ${formatDate(lowest.date)} (reserva: ${formatMoney(input.minimumReserve, currency)}).`,
      rule: "Aviso si el saldo previsto con tus previsiones del calendario baja de la reserva mínima en algún día del periodo.",
    });
  } else if (lowest && lowest.balance < 0n) {
    alerts.push({
      id: "forecast-negative",
      severity: "danger",
      title: "Tu saldo podría quedar en negativo",
      detail: `Saldo previsto más bajo: ${formatMoney(lowest.balance, currency)} el ${formatDate(lowest.date)}.`,
      rule: "Aviso si el saldo previsto con tus previsiones del calendario es negativo en algún día del periodo.",
    });
  }

  const explanation: Explanation = {
    formula: "Disponible = saldo actual + ingresos previstos − gastos previstos − reserva mínima − cantidades apartadas.",
    inputs: [
      { label: "Saldo actual (cuentas activas)", value: formatMoney(input.currentBalance, currency) },
      { label: `Ingresos previstos (${inHorizon.filter((o) => o.type === "INCOME").length})`, value: formatMoney(expectedIncome, currency) },
      { label: `Gastos previstos (${inHorizon.filter((o) => o.type === "EXPENSE").length})`, value: formatMoney(plannedExpense, currency) },
      ...(overdueExpense > 0n ? [{ label: "Gastos vencidos sin registrar", value: formatMoney(overdueExpense, currency) }] : []),
      { label: "Reserva mínima", value: formatMoney(input.minimumReserve, currency) },
      { label: "Cantidades apartadas", value: formatMoney(input.extraReserved, currency) },
      { label: "Disponible", value: formatMoney(available, currency) },
      { label: `Por día (${days} días, redondeado a la baja)`, value: perDay !== null ? formatMoney(perDay, currency) : "—" },
    ],
    period: `${input.horizonLabel}: ${formatRange({ start: input.today, endExclusive: addDays(input.horizonEnd, 1) })}`,
    assumptions: [
      "Solo se tienen en cuenta las previsiones de tu calendario; los gastos variables no previstos no se incluyen.",
      "Las previsiones de hoy aún sin registrar cuentan como pendientes.",
      "Es una estimación, no una garantía de que puedas gastar esa cantidad.",
    ],
    isEstimate: true,
  };

  return {
    available,
    perDay,
    days,
    expectedIncome,
    expectedExpense,
    overdueExpense,
    ignoredOverdueIncome,
    points,
    lowest,
    warnings,
    alerts,
    explanation,
  };
}

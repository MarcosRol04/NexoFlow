import "server-only";
import { type FinanceAlert, belowReserveAlert, negativeBalanceAlert, spendingIncreaseAlert } from "@/lib/finance/alerts";
import { addDays, formatRange, lastMonthKeys, monthKeyOf, monthRange, monthStart, todayIn } from "@/lib/finance/dates";
import {
  type Explanation,
  type MonthPoint,
  type PeriodSummary,
  compareSpendingMonthToDate,
  expensesByCategory,
  explainPeriodSummary,
  monthlySeries,
  summarizePeriod,
  totalBalance,
} from "@/lib/finance/ledger";
import { type Cents, formatMoney } from "@/lib/finance/money";
import { prisma } from "@/lib/db/prisma";
import { budgetAlert } from "@/lib/finance/budgets";
import { safeToSpend } from "@/lib/finance/forecast";
import { ledgerEntries } from "@/server/repositories/transactions";
import type { AccountView, TransactionView } from "@/types/finance";
import type { AppContext } from "../context";
import { listAccounts } from "./accounts";
import { type BudgetView, getBudgetMonth } from "./budgets";
import { type GoalView, listGoals } from "./goals";
import { type OccurrenceView, listScheduledItems, occurrencesWithStatus } from "./schedule";
import { recentTransactions } from "./transactions";

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  total: Cents;
  shareBp: bigint | null;
}

export interface DashboardData {
  today: string;
  monthKey: string;
  accounts: AccountView[];
  totalBalance: Cents;
  totalExplanation: Explanation;
  month: PeriodSummary;
  monthExplanation: Explanation;
  series: MonthPoint[];
  byCategory: CategorySlice[];
  alerts: FinanceAlert[];
  recent: TransactionView[];
  hasAnyTransaction: boolean;
  /** Presupuestos del mes ordenados por porcentaje consumido. */
  budgets: BudgetView[];
  goals: GoalView[];
  /** Compromisos previstos pendientes de los próximos 30 días. */
  upcoming: OccurrenceView[];
  overdueCount: number;
}

const MONTHS_IN_SERIES = 6;

export async function getDashboard(ctx: AppContext): Promise<DashboardData> {
  const today = todayIn(ctx.timezone);
  const monthKey = monthKeyOf(today);
  const months = lastMonthKeys(monthKey, MONTHS_IN_SERIES);
  const firstMonth = months[0] ?? monthKey;
  // El mes anterior se necesita para la comparación aunque la serie sea más corta.
  const range = { start: monthStart(firstMonth), endExclusive: addDays(today, 1) };

  const [accounts, entries, recent, anyTx, categories, budgetMonth, goals, scheduled] = await Promise.all([
    listAccounts(ctx, { includeArchived: true }),
    ledgerEntries(ctx.workspaceId, range),
    recentTransactions(ctx),
    prisma.transaction.findFirst({ where: { workspaceId: ctx.workspaceId }, select: { id: true } }),
    prisma.category.findMany({ where: { workspaceId: ctx.workspaceId }, select: { id: true, name: true, color: true } }),
    getBudgetMonth(ctx, monthKey),
    listGoals(ctx, { onlyActive: true }),
    listScheduledItems(ctx),
  ]);
  const occurrences = await occurrencesWithStatus(ctx, addDays(today, -31), addDays(today, 30), scheduled);
  const pending = occurrences.filter((o) => !o.registered);

  const active = accounts.filter((a) => !a.archived);
  const archivedWithBalance = accounts.filter((a) => a.archived && a.balanceCents !== 0n);
  const total = totalBalance(active.map((a) => a.balanceCents));

  const totalExplanation: Explanation = {
    formula: "Saldo total = suma de los saldos de tus cuentas activas. Saldo de una cuenta = saldo inicial + ingresos − gastos ± transferencias.",
    inputs: active.map((a) => ({ label: a.name, value: formatMoney(a.balanceCents, ctx.currency) })),
    period: `Hasta hoy (${today})`,
    assumptions: [
      "Es el saldo que has registrado en NexoFlow; puede diferir del de tu banco si faltan movimientos.",
      "Los objetivos de ahorro no se suman: son metas, no dinero adicional.",
      ...(archivedWithBalance.length > 0
        ? [`Hay ${archivedWithBalance.length} cuenta(s) archivada(s) con saldo distinto de cero que no se incluyen.`]
        : []),
    ],
    isEstimate: false,
  };

  const monthSummary = summarizePeriod(entries, { start: monthStart(monthKey), endExclusive: addDays(today, 1) });
  const monthExplanation = explainPeriodSummary(monthSummary, ctx.currency);

  // El mes actual solo incluye hasta hoy: los movimientos reales no pueden ser futuros.
  const series = monthlySeries(entries, months);

  const names = new Map<string, { name: string; color: string }>(categories.map((c) => [c.id, c]));
  const byCategory = expensesByCategory(entries, monthRange(monthKey)).map((g) => {
    const c = g.categoryId ? names.get(g.categoryId) : undefined;
    return {
      categoryId: g.categoryId,
      name: c?.name ?? "Sin categoría",
      color: c?.color ?? "#94a3b8",
      total: g.total,
      shareBp: g.shareBp,
    };
  });

  const alerts: FinanceAlert[] = [];
  const negative = negativeBalanceAlert(total, ctx.currency);
  if (negative) alerts.push(negative);
  const reserve = belowReserveAlert(total, ctx.minimumReserveCents, ctx.currency);
  if (reserve) alerts.push(reserve);
  const increase = spendingIncreaseAlert(compareSpendingMonthToDate(entries, today), ctx.currency);
  if (increase) alerts.push(increase);
  // Presupuestos del mes y previsión de saldo a 30 días con el calendario.
  for (const b of budgetMonth.budgets) {
    const alert = budgetAlert(b.id, b.categoryName, b.usage, ctx.budgetAlertThreshold, ctx.currency);
    if (alert) alerts.push(alert);
  }
  if (scheduled.some((i) => i.active)) {
    const forecast = safeToSpend({
      today,
      horizonEnd: addDays(today, 29),
      horizonLabel: "Próximos 30 días",
      currentBalance: total,
      upcoming: pending.filter((o) => o.date >= today),
      overdue: pending.filter((o) => o.date < today),
      minimumReserve: ctx.minimumReserveCents,
      extraReserved: 0n,
      hasAnyScheduledItem: true,
      currency: ctx.currency,
    });
    alerts.push(...forecast.alerts);
  }
  for (const a of active) {
    if (a.balanceCents < 0n) {
      alerts.push({
        id: `negative-account-${a.id}`,
        severity: "warning",
        title: `«${a.name}» está en negativo`,
        detail: `Saldo registrado: ${formatMoney(a.balanceCents, ctx.currency)}.`,
        rule: "Aviso si el saldo de una cuenta activa es menor que cero.",
      });
    }
  }

  return {
    today,
    monthKey,
    accounts: active,
    totalBalance: total,
    totalExplanation,
    month: monthSummary,
    monthExplanation,
    series,
    byCategory,
    alerts,
    recent,
    hasAnyTransaction: anyTx !== null,
    budgets: [...budgetMonth.budgets].sort((a, b) => (a.usage.consumedBp > b.usage.consumedBp ? -1 : a.usage.consumedBp < b.usage.consumedBp ? 1 : 0)),
    goals,
    upcoming: pending.filter((o) => o.date >= today),
    overdueCount: pending.filter((o) => o.date < today).length,
  };
}

/** Texto breve para la tarjeta de tasa de ahorro. */
export function savingsRateCaption(summary: PeriodSummary): string {
  if (summary.savingsRateBp === null) return "Sin ingresos este mes: no se puede calcular.";
  return `Del ${formatRange(summary.range)}`;
}

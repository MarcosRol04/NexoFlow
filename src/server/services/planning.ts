import "server-only";
import { type IsoDate, type MonthKey, addDays, addMonthsToKey, daysInMonth, lastMonthKeys, monthKeyOf, monthStart, todayIn } from "@/lib/finance/dates";
import { type SafeToSpendResult, safeToSpend } from "@/lib/finance/forecast";
import { monthlySeries, totalBalance } from "@/lib/finance/ledger";
import { divRound } from "@/lib/finance/money";
import { nextIncomeDate } from "@/lib/finance/schedule";
import { ledgerEntries } from "@/server/repositories/transactions";
import type { AppContext } from "../context";
import { listAccounts } from "./accounts";
import { listGoals } from "./goals";
import { listScheduledItems, occurrencesWithStatus } from "./schedule";

export const HORIZONS = ["proximo-ingreso", "fin-de-mes", "7", "14", "30"] as const;
export type Horizon = (typeof HORIZONS)[number];

export const HORIZON_LABELS: Record<Horizon, string> = {
  "proximo-ingreso": "Hasta tu próximo ingreso",
  "fin-de-mes": "Hasta fin de mes",
  "7": "Próximos 7 días",
  "14": "Próximos 14 días",
  "30": "Próximos 30 días",
};

function endOfMonth(today: IsoDate): IsoDate {
  const key = monthKeyOf(today);
  return `${key}-${String(daysInMonth(key)).padStart(2, "0")}`;
}

export interface SafeToSpendView {
  horizon: Horizon;
  horizonEnd: IsoDate;
  nextIncome: IsoDate | null;
  today: IsoDate;
  result: SafeToSpendResult;
  horizonNote: string | null;
}

export async function getSafeToSpend(ctx: AppContext, horizon: Horizon, extraReserved: bigint): Promise<SafeToSpendView> {
  const today = todayIn(ctx.timezone);
  const [accounts, items] = await Promise.all([listAccounts(ctx), listScheduledItems(ctx)]);
  const currentBalance = totalBalance(accounts.map((a) => a.balanceCents));
  const nextIncome = nextIncomeDate(items, addDays(today, -1));

  let horizonEnd: IsoDate;
  let horizonNote: string | null = null;
  switch (horizon) {
    case "proximo-ingreso":
      if (nextIncome && nextIncome > today) {
        horizonEnd = addDays(nextIncome, -1); // el día anterior al cobro
      } else if (nextIncome === today) {
        horizonEnd = today;
        horizonNote = "Tienes un ingreso previsto hoy: el periodo es solo el día de hoy.";
      } else {
        horizonEnd = endOfMonth(today);
        horizonNote = "No hay ingresos previstos en tu calendario: se usa el fin de mes.";
      }
      break;
    case "fin-de-mes":
      horizonEnd = endOfMonth(today);
      break;
    default:
      horizonEnd = addDays(today, Number(horizon) - 1);
  }

  const occurrences = await occurrencesWithStatus(ctx, addDays(today, -31), horizonEnd, items);
  const pending = occurrences.filter((o) => !o.registered);
  const result = safeToSpend({
    today,
    horizonEnd,
    horizonLabel: HORIZON_LABELS[horizon],
    currentBalance,
    upcoming: pending.filter((o) => o.date >= today),
    overdue: pending.filter((o) => o.date < today),
    minimumReserve: ctx.minimumReserveCents,
    extraReserved,
    hasAnyScheduledItem: items.some((i) => i.active),
    currency: ctx.currency,
  });
  return { horizon, horizonEnd, nextIncome, today, result, horizonNote };
}

export interface SimulationBaseline {
  startMonth: MonthKey;
  startBalance: bigint;
  avgIncome: bigint;
  avgExpense: bigint;
  monthsUsed: MonthKey[];
  monthsWithData: number;
  goals: { id: string; name: string; target: bigint; saved: bigint }[];
}

/** Valores base del simulador: saldo actual y medias de los 3 últimos meses completos. */
export async function getSimulationBaseline(ctx: AppContext): Promise<SimulationBaseline> {
  const today = todayIn(ctx.timezone);
  const current = monthKeyOf(today);
  const months = lastMonthKeys(addMonthsToKey(current, -1), 3);
  const first = months[0] ?? current;
  const [accounts, entries, goals] = await Promise.all([
    listAccounts(ctx),
    ledgerEntries(ctx.workspaceId, { start: monthStart(first), endExclusive: monthStart(current) }),
    listGoals(ctx, { onlyActive: true }),
  ]);
  const series = monthlySeries(entries, months);
  const withData = series.filter((p) => p.income > 0n || p.expense > 0n);
  const n = BigInt(Math.max(1, withData.length));
  return {
    startMonth: addMonthsToKey(current, 1),
    startBalance: totalBalance(accounts.map((a) => a.balanceCents)),
    avgIncome: withData.length ? divRound(withData.reduce((a, p) => a + p.income, 0n), n) : 0n,
    avgExpense: withData.length ? divRound(withData.reduce((a, p) => a + p.expense, 0n), n) : 0n,
    monthsUsed: withData.map((p) => p.month),
    monthsWithData: withData.length,
    goals: goals.filter((g) => !g.progress.reached).map((g) => ({ id: g.id, name: g.name, target: g.targetCents, saved: g.progress.saved })),
  };
}

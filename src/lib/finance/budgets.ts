// Presupuestos mensuales por categoría de gasto.

import type { FinanceAlert } from "./alerts";
import { type IsoDate, type MonthKey, daysInMonth, formatMonth, monthKeyOf } from "./dates";
import type { Explanation } from "./ledger";
import { type Cents, divRound, formatBp, formatMoney, ratioBp } from "./money";

export type BudgetStatus = "ok" | "warning" | "exceeded";

export interface BudgetUsage {
  limit: Cents;
  spent: Cents;
  /** Límite − gastado. Negativo si se ha superado. */
  remaining: Cents;
  /** Gastado / límite, en puntos básicos (puede superar 10 000). */
  consumedBp: bigint;
  status: BudgetStatus;
  /** Gasto previsto a fin de mes al ritmo actual (solo mes en curso, desde el día 5). */
  projected: Cents | null;
  isCurrentMonth: boolean;
}

/** Días mínimos transcurridos para proyectar el gasto a fin de mes. */
export const BUDGET_PROJECTION_MIN_DAYS = 5;

export function budgetUsage(
  limit: Cents,
  spent: Cents,
  thresholdPercent: number,
  options: { month: MonthKey; today: IsoDate },
): BudgetUsage {
  if (limit <= 0n) throw new RangeError("El límite debe ser positivo");
  const consumedBp = ratioBp(spent, limit) ?? 0n;
  const thresholdBp = BigInt(Math.round(thresholdPercent)) * 100n;
  const status: BudgetStatus = spent > limit ? "exceeded" : consumedBp >= thresholdBp ? "warning" : "ok";

  const isCurrentMonth = monthKeyOf(options.today) === options.month;
  let projected: Cents | null = null;
  if (isCurrentMonth) {
    const elapsed = Number(options.today.slice(8, 10));
    if (elapsed >= BUDGET_PROJECTION_MIN_DAYS) {
      projected = divRound(spent * BigInt(daysInMonth(options.month)), BigInt(elapsed));
    }
  }
  return { limit, spent, remaining: limit - spent, consumedBp, status, projected, isCurrentMonth };
}

export function explainBudget(name: string, usage: BudgetUsage, month: MonthKey, thresholdPercent: number, currency: string): Explanation {
  const inputs = [
    { label: "Límite", value: formatMoney(usage.limit, currency) },
    { label: "Gastado", value: formatMoney(usage.spent, currency) },
    { label: "Restante", value: formatMoney(usage.remaining, currency) },
    { label: "Consumido", value: formatBp(usage.consumedBp) },
  ];
  const assumptions = [
    `Se suman los gastos de la categoría «${name}» en ${formatMonth(month)}.`,
    `Aviso al llegar al ${thresholdPercent} % del límite (configurable en Ajustes).`,
  ];
  if (usage.projected !== null) {
    inputs.push({ label: "Previsión a fin de mes (estimación)", value: formatMoney(usage.projected, currency) });
    assumptions.push("La previsión supone que sigues gastando al mismo ritmo diario que hasta hoy.");
  }
  return {
    formula: "Restante = límite − gastado. Consumido = gastado ÷ límite.",
    inputs,
    period: formatMonth(month),
    assumptions,
    isEstimate: false,
  };
}

export function budgetAlert(id: string, name: string, usage: BudgetUsage, thresholdPercent: number, currency: string): FinanceAlert | null {
  if (usage.status === "exceeded") {
    return {
      id: `budget-${id}`,
      severity: "danger",
      title: `Has superado el presupuesto de «${name}»`,
      detail: `Gastado ${formatMoney(usage.spent, currency)} de ${formatMoney(usage.limit, currency)} (${formatBp(usage.consumedBp, 0)}).`,
      rule: "Aviso si el gasto de la categoría supera el límite del mes.",
    };
  }
  if (usage.status === "warning") {
    return {
      id: `budget-${id}`,
      severity: "warning",
      title: `«${name}» está cerca de su límite`,
      detail: `Gastado ${formatMoney(usage.spent, currency)} de ${formatMoney(usage.limit, currency)} (${formatBp(usage.consumedBp, 0)}); quedan ${formatMoney(usage.remaining, currency)}.`,
      rule: `Aviso al alcanzar el ${thresholdPercent} % del límite del mes.`,
    };
  }
  if (usage.projected !== null && usage.projected > usage.limit) {
    return {
      id: `budget-${id}`,
      severity: "info",
      title: `A este ritmo superarías «${name}»`,
      detail: `Estimación a fin de mes: ${formatMoney(usage.projected, currency)} frente a un límite de ${formatMoney(usage.limit, currency)}.`,
      rule: "Estimación lineal: gasto hasta hoy ÷ días transcurridos × días del mes (a partir del día 5).",
    };
  }
  return null;
}

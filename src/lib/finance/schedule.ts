// Compromisos previstos (calendario): reglas de repetición y sus fechas.
// Una previsión NO es un movimiento real: solo cuenta en estimaciones hasta
// que el usuario la registra como movimiento.

import { type IsoDate, addDays, addMonthsToDate, diffDays, isIsoDate } from "./dates";
import { monthsBetween } from "./goals";
import type { Cents } from "./money";

export type Frequency = "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  ONCE: "Una vez",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

export interface ScheduledRule {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: Cents;
  description: string;
  frequency: Frequency;
  startDate: IsoDate;
  endDate: IsoDate | null;
  active: boolean;
  accountId?: string | null;
  categoryId?: string | null;
}

export interface Occurrence {
  itemId: string;
  date: IsoDate;
  type: "INCOME" | "EXPENSE";
  amountCents: Cents;
  description: string;
}

const MAX_OCCURRENCES = 1000;

function monthsStep(f: Frequency): number {
  return f === "MONTHLY" ? 1 : f === "QUARTERLY" ? 3 : 12;
}

/** Fechas en las que se repite una previsión entre `from` y `to` (ambas incluidas). */
export function occurrenceDates(rule: ScheduledRule, from: IsoDate, to: IsoDate): IsoDate[] {
  if (!rule.active || !isIsoDate(from) || !isIsoDate(to) || from > to) return [];
  const last = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (rule.startDate > last) return [];
  const out: IsoDate[] = [];

  if (rule.frequency === "ONCE") {
    if (rule.startDate >= from && rule.startDate <= last) out.push(rule.startDate);
    return out;
  }

  if (rule.frequency === "WEEKLY") {
    const skip = Math.max(0, Math.floor(diffDays(rule.startDate, from) / 7));
    for (let k = skip; out.length < MAX_OCCURRENCES; k += 1) {
      const d = addDays(rule.startDate, k * 7);
      if (d > last) break;
      if (d >= from) out.push(d);
    }
    return out;
  }

  const step = monthsStep(rule.frequency);
  // Se calcula siempre desde la fecha de inicio para no arrastrar ajustes de fin de mes.
  const skip = Math.max(0, Math.floor(monthsBetween(rule.startDate, from) / step) - 1);
  for (let k = skip; out.length < MAX_OCCURRENCES; k += 1) {
    const d = addMonthsToDate(rule.startDate, k * step);
    if (d > last) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export function expandOccurrences(rules: ScheduledRule[], from: IsoDate, to: IsoDate): Occurrence[] {
  const list: Occurrence[] = [];
  for (const r of rules) {
    for (const date of occurrenceDates(r, from, to)) {
      list.push({ itemId: r.id, date, type: r.type, amountCents: r.amountCents, description: r.description });
    }
  }
  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === b.type ? 0 : a.type === "INCOME" ? -1 : 1));
}

export function occurrenceKey(itemId: string, date: IsoDate): string {
  return `${itemId}|${date}`;
}

/** Primera fecha de ingreso previsto posterior a `after` (hasta un año). */
export function nextIncomeDate(rules: ScheduledRule[], after: IsoDate): IsoDate | null {
  const occ = expandOccurrences(
    rules.filter((r) => r.type === "INCOME"),
    addDays(after, 1),
    addDays(after, 366),
  );
  return occ[0]?.date ?? null;
}

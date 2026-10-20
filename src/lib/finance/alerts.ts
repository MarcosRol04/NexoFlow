// Avisos deterministas (sin inteligencia artificial): cada aviso indica la
// regla que lo ha activado y los datos que lo justifican.

import { formatRange } from "./dates";
import type { SpendingComparison } from "./ledger";
import { type Cents, formatBp, formatMoney } from "./money";

export type AlertSeverity = "info" | "warning" | "danger";

export interface FinanceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** Regla que ha generado el aviso, en lenguaje llano. */
  rule: string;
}

export const SPENDING_INCREASE_THRESHOLD_BP = 2_000n; // +20 %
export const SPENDING_INCREASE_MIN_CENTS = 5_000n; // 50 €: evita avisos por importes pequeños
export const SPENDING_MIN_DAYS = 5; // los primeros días del mes no son representativos

export function spendingIncreaseAlert(cmp: SpendingComparison, currency: string): FinanceAlert | null {
  if (cmp.days < SPENDING_MIN_DAYS) return null;
  if (cmp.changeBp === null) return null;
  const diff = cmp.current.expense - cmp.previous.expense;
  if (cmp.changeBp < SPENDING_INCREASE_THRESHOLD_BP || diff < SPENDING_INCREASE_MIN_CENTS) return null;
  return {
    id: "spending-increase",
    severity: "warning",
    title: `Gastas un ${formatBp(cmp.changeBp, 0)} más que el mes pasado`,
    detail:
      `${formatMoney(cmp.current.expense, currency)} del ${formatRange(cmp.current.range)} frente a ` +
      `${formatMoney(cmp.previous.expense, currency)} del ${formatRange(cmp.previous.range)} (mismos días del mes).`,
    rule: "Aviso si el gasto del mes hasta hoy supera en un 20 % o más (y en al menos 50 €) al del mismo tramo del mes anterior, a partir del día 5.",
  };
}

export function negativeBalanceAlert(totalCents: Cents, currency: string): FinanceAlert | null {
  if (totalCents >= 0n) return null;
  return {
    id: "negative-total",
    severity: "danger",
    title: "Tu saldo total registrado es negativo",
    detail: `La suma de los saldos de tus cuentas activas es ${formatMoney(totalCents, currency)}.`,
    rule: "Aviso si la suma de saldos de las cuentas activas es menor que cero.",
  };
}

export function belowReserveAlert(totalCents: Cents, reserveCents: Cents, currency: string): FinanceAlert | null {
  if (reserveCents <= 0n || totalCents < 0n || totalCents >= reserveCents) return null;
  return {
    id: "below-reserve",
    severity: "warning",
    title: "Estás por debajo de tu reserva mínima",
    detail: `Saldo total ${formatMoney(totalCents, currency)}; reserva mínima ${formatMoney(reserveCents, currency)}.`,
    rule: "Aviso si el saldo total registrado es inferior a la reserva mínima definida en Ajustes.",
  };
}

// Objetivos de ahorro. Un objetivo es una meta: NO es dinero adicional ni se
// suma a los saldos. Lo «ahorrado» es lo que el usuario declara haber apartado
// (importe inicial + aportaciones − retiradas).

import { type IsoDate, addDays, addMonthsToDate, compareIso, formatDate, monthKeyOf } from "./dates";
import type { Explanation } from "./ledger";
import { type Cents, formatBp, formatMoney, ratioBp } from "./money";

export interface GoalMovementInput {
  kind: "CONTRIBUTION" | "WITHDRAWAL";
  amountCents: Cents;
  date: IsoDate;
}

export interface GoalInput {
  targetCents: Cents;
  initialCents: Cents;
  movements: GoalMovementInput[];
  targetDate: IsoDate | null;
}

export interface GoalProgress {
  saved: Cents;
  remaining: Cents;
  /** Progreso en pb, limitado a 10 000 (100 %). */
  progressBp: bigint;
  reached: boolean;
  /** Meses naturales hasta la fecha objetivo (mínimo 1); null sin fecha o si ya pasó. */
  monthsLeft: number | null;
  /** Aportación mensual necesaria para llegar a tiempo (redondeada al alza). */
  requiredMonthly: Cents | null;
  /** Media mensual de aportaciones netas de los últimos 90 días. */
  recentMonthlyRate: Cents | null;
  /** Fecha estimada al ritmo reciente. */
  estimatedDate: IsoDate | null;
  targetDatePassed: boolean;
}

/** División entera redondeando hacia arriba (para no quedarse corto). */
function ceilDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new RangeError("Divisor no positivo");
  if (a <= 0n) return 0n;
  return (a + b - 1n) / b;
}

export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const [fy, fm] = monthKeyOf(from).split("-").map(Number) as [number, number];
  const [ty, tm] = monthKeyOf(to).split("-").map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm);
}

export function goalProgress(input: GoalInput, today: IsoDate): GoalProgress {
  let saved = input.initialCents;
  let recentNet = 0n;
  const recentFrom = addDays(today, -90);
  for (const m of input.movements) {
    const signed = m.kind === "CONTRIBUTION" ? m.amountCents : -m.amountCents;
    saved += signed;
    if (m.date > recentFrom && m.date <= today) recentNet += signed;
  }
  const remaining = saved >= input.targetCents ? 0n : input.targetCents - saved;
  const raw = ratioBp(saved < 0n ? 0n : saved, input.targetCents) ?? 0n;
  const progressBp = raw > 10_000n ? 10_000n : raw;
  const reached = remaining === 0n;

  let monthsLeft: number | null = null;
  let requiredMonthly: Cents | null = null;
  const targetDatePassed = input.targetDate !== null && compareIso(input.targetDate, today) < 0;
  if (input.targetDate && !targetDatePassed && !reached) {
    monthsLeft = Math.max(1, monthsBetween(today, input.targetDate));
    requiredMonthly = ceilDiv(remaining, BigInt(monthsLeft));
  }

  const recentMonthlyRate = recentNet > 0n ? ceilDiv(recentNet, 3n) : null;
  let estimatedDate: IsoDate | null = null;
  if (!reached && recentMonthlyRate !== null) {
    const months = Number(ceilDiv(remaining, recentMonthlyRate));
    if (months <= 600) estimatedDate = addMonthsToDate(today, months);
  }

  return { saved, remaining, progressBp, reached, monthsLeft, requiredMonthly, recentMonthlyRate, estimatedDate, targetDatePassed };
}

export function explainGoal(input: GoalInput, p: GoalProgress, currency: string): Explanation {
  const contributions = input.movements.filter((m) => m.kind === "CONTRIBUTION").reduce((a, m) => a + m.amountCents, 0n);
  const withdrawals = input.movements.filter((m) => m.kind === "WITHDRAWAL").reduce((a, m) => a + m.amountCents, 0n);
  const inputs = [
    { label: "Objetivo", value: formatMoney(input.targetCents, currency) },
    { label: "Importe inicial", value: formatMoney(input.initialCents, currency) },
    { label: "Aportaciones", value: formatMoney(contributions, currency) },
    { label: "Retiradas", value: formatMoney(withdrawals, currency) },
    { label: "Ahorrado", value: formatMoney(p.saved, currency) },
    { label: "Progreso", value: formatBp(p.progressBp) },
  ];
  const assumptions = [
    "Un objetivo no es dinero adicional: no se suma a tus saldos.",
    "Lo ahorrado es lo que registras como aportado al objetivo.",
  ];
  if (p.requiredMonthly !== null && p.monthsLeft !== null) {
    inputs.push({ label: `Necesario al mes (${p.monthsLeft} mes(es))`, value: formatMoney(p.requiredMonthly, currency) });
    assumptions.push("Meses = meses naturales desde el actual hasta el de la fecha objetivo (mínimo 1). Se redondea al alza.");
  }
  if (p.recentMonthlyRate !== null) {
    inputs.push({ label: "Ritmo reciente (90 días ÷ 3)", value: formatMoney(p.recentMonthlyRate, currency) });
  }
  if (p.estimatedDate) {
    inputs.push({ label: "Fecha estimada a ese ritmo", value: formatDate(p.estimatedDate) });
    assumptions.push("La fecha estimada supone que sigues aportando al mismo ritmo de los últimos 90 días. Es una estimación.");
  } else if (!p.reached) {
    assumptions.push("Sin aportaciones netas en los últimos 90 días no se puede estimar una fecha.");
  }
  if (p.targetDatePassed && !p.reached) assumptions.push("La fecha objetivo ya ha pasado.");
  return {
    formula: "Ahorrado = inicial + aportaciones − retiradas. Restante = objetivo − ahorrado. Necesario al mes = restante ÷ meses hasta la fecha.",
    inputs,
    assumptions,
    isEstimate: p.estimatedDate !== null,
  };
}

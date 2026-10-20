// Simulador de escenarios. Trabaja solo en memoria: NUNCA modifica cuentas ni
// crea movimientos. Compara un escenario base (ingresos y gastos mensuales
// medios) con un escenario modificado.

import { type MonthKey, addMonthsToKey, formatMonth } from "./dates";
import type { Explanation } from "./ledger";
import { type Cents, divRound, formatMoney } from "./money";

export interface SimulationInput {
  startMonth: MonthKey; // primer mes simulado
  months: number; // 1..36
  startBalance: Cents;
  baseIncome: Cents; // mensual
  baseExpense: Cents; // mensual
  /** Variación porcentual de ingresos/gastos en puntos básicos (−10 % = −1000). */
  incomeChangeBp: bigint;
  expenseChangeBp: bigint;
  /** Variación fija mensual (positiva o negativa). */
  incomeChangeCents: Cents;
  expenseChangeCents: Cents;
  /** Gastar esta cantidad menos cada mes para ahorrarla. */
  extraSavingCents: Cents;
  /** Compra puntual. */
  purchase: { amount: Cents; month: number } | null;
  /** Objetivo de ahorro a alcanzar con el balance mensual. */
  goal: { target: Cents; saved: Cents } | null;
  minimumReserve: Cents;
  currency: string;
}

export interface SimulationMonth {
  index: number; // 1..months
  month: MonthKey;
  baseBalance: Cents;
  scenarioBalance: Cents;
}

export interface SimulationResult {
  scenarioIncome: Cents;
  scenarioExpense: Cents;
  baseNet: Cents;
  scenarioNet: Cents;
  points: SimulationMonth[];
  baseEnd: Cents;
  scenarioEnd: Cents;
  scenarioLowest: SimulationMonth | null;
  firstNegative: SimulationMonth | null;
  firstBelowReserve: SimulationMonth | null;
  goalMonthsBase: number | null;
  goalMonthsScenario: number | null;
  explanation: Explanation;
}

function applyChange(base: Cents, bp: bigint, fixed: Cents): Cents {
  const value = base + divRound(base * bp, 10_000n) + fixed;
  return value < 0n ? 0n : value;
}

function monthsToGoal(target: Cents, saved: Cents, monthlyNet: Cents): number | null {
  const remaining = target - saved;
  if (remaining <= 0n) return 0;
  if (monthlyNet <= 0n) return null;
  return Number((remaining + monthlyNet - 1n) / monthlyNet);
}

export function simulate(input: SimulationInput): SimulationResult {
  const months = Math.min(36, Math.max(1, Math.trunc(input.months)));
  const scenarioIncome = applyChange(input.baseIncome, input.incomeChangeBp, input.incomeChangeCents);
  const expenseBeforeSaving = applyChange(input.baseExpense, input.expenseChangeBp, input.expenseChangeCents);
  const scenarioExpense = expenseBeforeSaving - input.extraSavingCents < 0n ? 0n : expenseBeforeSaving - input.extraSavingCents;
  const baseNet = input.baseIncome - input.baseExpense;
  const scenarioNet = scenarioIncome - scenarioExpense;

  const points: SimulationMonth[] = [];
  let base = input.startBalance;
  let scenario = input.startBalance;
  for (let i = 1; i <= months; i += 1) {
    base += baseNet;
    scenario += scenarioNet;
    if (input.purchase && input.purchase.month === i) scenario -= input.purchase.amount;
    points.push({ index: i, month: addMonthsToKey(input.startMonth, i - 1), baseBalance: base, scenarioBalance: scenario });
  }

  let scenarioLowest: SimulationMonth | null = null;
  for (const p of points) if (!scenarioLowest || p.scenarioBalance < scenarioLowest.scenarioBalance) scenarioLowest = p;
  const firstNegative = points.find((p) => p.scenarioBalance < 0n) ?? null;
  const firstBelowReserve = input.minimumReserve > 0n ? (points.find((p) => p.scenarioBalance < input.minimumReserve) ?? null) : null;

  const goalMonthsBase = input.goal ? monthsToGoal(input.goal.target, input.goal.saved, baseNet) : null;
  const goalMonthsScenario = input.goal ? monthsToGoal(input.goal.target, input.goal.saved, scenarioNet) : null;

  const c = input.currency;
  const inputs = [
    { label: "Saldo de partida", value: formatMoney(input.startBalance, c) },
    { label: "Ingresos mensuales base → escenario", value: `${formatMoney(input.baseIncome, c)} → ${formatMoney(scenarioIncome, c)}` },
    { label: "Gastos mensuales base → escenario", value: `${formatMoney(input.baseExpense, c)} → ${formatMoney(scenarioExpense, c)}` },
    { label: "Balance mensual base → escenario", value: `${formatMoney(baseNet, c)} → ${formatMoney(scenarioNet, c)}` },
  ];
  if (input.purchase) inputs.push({ label: `Compra en el mes ${input.purchase.month}`, value: formatMoney(input.purchase.amount, c) });
  inputs.push({ label: `Saldo final (${months} meses) base → escenario`, value: `${formatMoney(points.at(-1)?.baseBalance ?? base, c)} → ${formatMoney(points.at(-1)?.scenarioBalance ?? scenario, c)}` });

  return {
    scenarioIncome,
    scenarioExpense,
    baseNet,
    scenarioNet,
    points,
    baseEnd: base,
    scenarioEnd: scenario,
    scenarioLowest,
    firstNegative,
    firstBelowReserve,
    goalMonthsBase,
    goalMonthsScenario,
    explanation: {
      formula: "Saldo de cada mes = saldo anterior + ingresos mensuales − gastos mensuales − compras puntuales de ese mes.",
      inputs,
      period: `${formatMonth(input.startMonth)} – ${formatMonth(addMonthsToKey(input.startMonth, months - 1))}`,
      assumptions: [
        "Simulación hipotética: no modifica tus cuentas ni crea movimientos.",
        "Supone ingresos y gastos iguales todos los meses (sin estacionalidad, inflación ni intereses).",
        "Los valores base son medias de tus últimos meses completos y puedes cambiarlos.",
        "No es asesoramiento financiero.",
      ],
      isEstimate: true,
    },
  };
}

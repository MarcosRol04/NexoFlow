import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Explain } from "@/components/ui/explain";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge, Callout, PageHeader } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { SimulationChart } from "@/features/planning/charts";
import { formatMonth, formatShortMonth } from "@/lib/finance/dates";
import { centsToChartNumber, centsToInput, parseAmount } from "@/lib/finance/money";
import { simulate } from "@/lib/finance/simulator";
import { requireContext } from "@/server/context";
import { getSimulationBaseline } from "@/server/services/planning";

export const metadata: Metadata = { title: "Simulador" };

type SP = Record<string, string | string[] | undefined>;

/** Lee un importe de la URL. Vacío → valor por defecto. Devuelve el error si no es válido. */
function amountParam(sp: SP, key: string, fallback: bigint, opts: { allowNegative?: boolean } = {}) {
  const raw = typeof sp[key] === "string" ? (sp[key] as string).trim() : "";
  if (!raw) return { value: fallback, raw: "", error: undefined as string | undefined };
  const r = parseAmount(raw, { allowZero: true, allowNegative: opts.allowNegative });
  return r.ok ? { value: r.cents, raw, error: undefined } : { value: fallback, raw, error: r.error };
}

function intParam(sp: SP, key: string, fallback: number, min: number, max: number) {
  const n = Number.parseInt(typeof sp[key] === "string" ? (sp[key] as string) : "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const baseline = await getSimulationBaseline(ctx);

  const months = intParam(sp, "meses", 12, 1, 36);
  const startBalance = amountParam(sp, "saldo", baseline.startBalance, { allowNegative: true });
  const income = amountParam(sp, "ingresos", baseline.avgIncome);
  const expense = amountParam(sp, "gastos", baseline.avgExpense);
  // Los porcentajes se leen con la misma regla que los importes: "10,5" → 1050 pb = 10,5 %.
  const incomePct = amountParam(sp, "var_ingresos_pct", 0n, { allowNegative: true });
  const incomeEur = amountParam(sp, "var_ingresos_eur", 0n, { allowNegative: true });
  const expensePct = amountParam(sp, "var_gastos_pct", 0n, { allowNegative: true });
  const expenseEur = amountParam(sp, "var_gastos_eur", 0n, { allowNegative: true });
  const extraSaving = amountParam(sp, "ahorro_extra", 0n);
  const purchase = amountParam(sp, "compra", 0n);
  const purchaseMonth = intParam(sp, "compra_mes", 1, 1, months);
  const goalId = typeof sp.objetivo === "string" ? sp.objetivo : "";
  const goal = baseline.goals.find((g) => g.id === goalId) ?? null;

  const errors = [startBalance, income, expense, incomePct, incomeEur, expensePct, expenseEur, extraSaving, purchase].some((p) => p.error);
  const pctOutOfRange = incomePct.value < -10_000n || incomePct.value > 100_000n || expensePct.value < -10_000n || expensePct.value > 100_000n;

  const result = simulate({
    startMonth: baseline.startMonth,
    months,
    startBalance: startBalance.value,
    baseIncome: income.value,
    baseExpense: expense.value,
    incomeChangeBp: pctOutOfRange ? 0n : incomePct.value,
    expenseChangeBp: pctOutOfRange ? 0n : expensePct.value,
    incomeChangeCents: incomeEur.value,
    expenseChangeCents: expenseEur.value,
    extraSavingCents: extraSaving.value,
    purchase: purchase.value > 0n ? { amount: purchase.value, month: purchaseMonth } : null,
    goal: goal ? { target: goal.target, saved: goal.saved } : null,
    minimumReserve: ctx.minimumReserveCents,
    currency: ctx.currency,
  });
  const chart = result.points.map((p) => ({
    label: formatShortMonth(p.month),
    base: centsToChartNumber(p.baseBalance),
    escenario: centsToChartNumber(p.scenarioBalance),
  }));
  const c = ctx.currency;

  const field = (id: string, label: string, value: { raw: string; error?: string }, placeholder: string, hint?: string) => (
    <Field id={id} label={label} error={value.error} hint={hint}>
      <Input id={id} name={id} inputMode="decimal" defaultValue={value.raw} placeholder={placeholder} aria-invalid={value.error ? true : undefined} />
    </Field>
  );

  return (
    <>
      <PageHeader
        title="Simulador"
        description="Prueba escenarios hipotéticos. Nada de lo que hagas aquí cambia tus cuentas ni crea movimientos."
      />

      {baseline.monthsWithData === 0 && (
        <Callout tone="info" className="mb-6">
          No hay meses completos con movimientos todavía: los valores base son 0 €. Escribe tus ingresos y gastos mensuales habituales.
        </Callout>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="h-fit lg:col-span-2">
          <CardHeader title="Supuestos" description="Deja un campo vacío para usar el valor base." />
          <CardBody>
            <form method="get" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("saldo", "Saldo de partida (€)", startBalance, centsToInput(baseline.startBalance), "Por defecto, tu saldo total actual.")}
                <Field id="meses" label="Meses a simular">
                  <Input id="meses" name="meses" type="number" min={1} max={36} defaultValue={months} />
                </Field>
                {field("ingresos", "Ingresos al mes (€)", income, centsToInput(baseline.avgIncome))}
                {field("gastos", "Gastos al mes (€)", expense, centsToInput(baseline.avgExpense))}
              </div>
              <p className="text-xs text-slate-500">
                Valores base: media de {baseline.monthsUsed.length > 0 ? baseline.monthsUsed.map(formatMonth).join(", ") : "ningún mes"}.
              </p>
              <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium text-slate-700">Cambios</legend>
                <div className="grid grid-cols-2 gap-3">
                  {field("var_ingresos_pct", "Ingresos (%)", incomePct, "0", "Ej.: -10")}
                  {field("var_ingresos_eur", "Ingresos (€/mes)", incomeEur, "0")}
                  {field("var_gastos_pct", "Gastos (%)", expensePct, "0", "Ej.: 5")}
                  {field("var_gastos_eur", "Gastos (€/mes)", expenseEur, "0")}
                </div>
                {field("ahorro_extra", "Ahorro adicional (€/mes)", extraSaving, "0", "Gastar esta cantidad menos cada mes.")}
              </fieldset>
              <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium text-slate-700">¿Puedo permitirme una compra?</legend>
                <div className="grid grid-cols-2 gap-3">
                  {field("compra", "Importe (€)", purchase, "0")}
                  <Field id="compra_mes" label="En el mes nº">
                    <Input id="compra_mes" name="compra_mes" type="number" min={1} max={months} defaultValue={purchaseMonth} />
                  </Field>
                </div>
              </fieldset>
              {baseline.goals.length > 0 && (
                <Field id="objetivo" label="Objetivo de ahorro">
                  <Select id="objetivo" name="objetivo" defaultValue={goal?.id ?? ""}>
                    <option value="">Ninguno</option>
                    {baseline.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="flex gap-2">
                <button type="submit" className={buttonClass("primary")}>
                  Simular
                </button>
                <Link href="/simulador" className={buttonClass("ghost")}>
                  Restablecer
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          {(errors || pctOutOfRange) && (
            <Callout tone="danger" role="alert">
              {pctOutOfRange ? "Los porcentajes deben estar entre −100 % y 1000 %; se han ignorado." : "Algún valor no es válido; se ha usado el valor base en su lugar."}
            </Callout>
          )}
          <Card>
            <CardHeader
              title="Saldo simulado"
              description={`${formatMonth(baseline.startMonth)} en adelante, a partir del saldo de partida.`}
              action={<Badge tone="estimate">Simulación</Badge>}
            />
            <CardBody>
              <SimulationChart data={chart} />
            </CardBody>
          </Card>

          <Card className="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Balance mensual</p>
              <p className="text-lg font-semibold">
                <Money cents={result.scenarioNet} currency={c} tone="auto" signed />
              </p>
              <p className="text-xs text-slate-500">
                Base: <Money cents={result.baseNet} currency={c} signed />
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Saldo al final</p>
              <p className="text-lg font-semibold">
                <Money cents={result.scenarioEnd} currency={c} tone={result.scenarioEnd < 0n ? "auto" : "plain"} />
              </p>
              <p className="text-xs text-slate-500">
                Base: <Money cents={result.baseEnd} currency={c} />
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Saldo más bajo</p>
              <p className="text-lg font-semibold">
                {result.scenarioLowest ? <Money cents={result.scenarioLowest.scenarioBalance} currency={c} tone={result.scenarioLowest.scenarioBalance < 0n ? "auto" : "plain"} /> : "—"}
              </p>
              <p className="text-xs text-slate-500">{result.scenarioLowest ? formatMonth(result.scenarioLowest.month) : ""}</p>
            </div>
          </Card>

          {result.firstNegative ? (
            <Callout tone="danger" title={`Saldo negativo en ${formatMonth(result.firstNegative.month)}`}>
              Con estos supuestos, tu saldo bajaría de cero en el mes {result.firstNegative.index} (
              <Money cents={result.firstNegative.scenarioBalance} currency={c} />).
            </Callout>
          ) : result.firstBelowReserve ? (
            <Callout tone="warning" title={`Por debajo de tu reserva en ${formatMonth(result.firstBelowReserve.month)}`}>
              El saldo simulado no llega a ser negativo, pero baja de tu reserva mínima (<Money cents={ctx.minimumReserveCents} currency={c} />).
            </Callout>
          ) : (
            <Callout tone="success" title="El saldo simulado no baja de cero">
              {ctx.minimumReserveCents > 0n ? "Ni de tu reserva mínima. " : ""}Recuerda que es una simulación con supuestos constantes, no una garantía.
            </Callout>
          )}

          {goal && (
            <Callout tone="info" title={`Objetivo «${goal.name}»`}>
              Faltan <Money cents={goal.target - goal.saved} currency={c} />.{" "}
              {result.goalMonthsScenario === null
                ? "Con el balance mensual del escenario (no positivo) no se alcanzaría."
                : `Con el escenario lo alcanzarías en ${result.goalMonthsScenario} mes(es)`}
              {result.goalMonthsScenario !== null &&
                (result.goalMonthsBase === null ? " (sin cambios, no se alcanzaría)." : ` (sin cambios: ${result.goalMonthsBase} mes(es)).`)}{" "}
              Supone dedicar todo el balance mensual positivo al objetivo.
            </Callout>
          )}

          <Card className="p-5">
            <Explain explanation={result.explanation} label="Cómo se calcula la simulación" />
            <p className="mt-3 text-xs text-slate-500">
              La simulación empieza el mes que viene con tu saldo actual. NexoFlow no da recomendaciones de inversión ni asesoramiento financiero.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

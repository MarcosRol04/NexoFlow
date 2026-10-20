import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Explain } from "@/components/ui/explain";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge, Callout, PageHeader } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { ForecastChart } from "@/features/planning/charts";
import { formatDate, formatLongDate } from "@/lib/finance/dates";
import { centsToChartNumber, centsToInput, parseAmount } from "@/lib/finance/money";
import { requireContext } from "@/server/context";
import { HORIZONS, HORIZON_LABELS, type Horizon, getSafeToSpend } from "@/server/services/planning";

export const metadata: Metadata = { title: "Dinero disponible" };

export default async function SafeToSpendPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const horizon: Horizon = HORIZONS.find((h) => h === sp.horizonte) ?? "proximo-ingreso";
  const reservedText = typeof sp.reservar === "string" ? sp.reservar : "";
  const reservedParsed = reservedText ? parseAmount(reservedText, { allowZero: true }) : null;
  const extraReserved = reservedParsed?.ok ? reservedParsed.cents : 0n;
  const reservedError = reservedParsed && !reservedParsed.ok ? reservedParsed.error : null;

  const view = await getSafeToSpend(ctx, horizon, extraReserved);
  const r = view.result;
  const chart = r.points.map((p) => ({ label: formatDate(p.date).replace(/ \d{4}$/, ""), saldo: centsToChartNumber(p.balance) }));

  return (
    <>
      <PageHeader
        title="Dinero disponible"
        description="Una estimación de cuánto podrías gastar sin bajar de tu reserva mínima, teniendo en cuenta tus pagos y cobros previstos."
      />

      <Card className="mb-6 p-4">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <Field id="horizonte" label="Periodo" className="min-w-56">
            <Select id="horizonte" name="horizonte" defaultValue={horizon}>
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {HORIZON_LABELS[h]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="reservar" label="Apartar además (€)" error={reservedError ?? undefined} className="w-44">
            <Input id="reservar" name="reservar" inputMode="decimal" defaultValue={reservedText} placeholder="0" aria-invalid={reservedError ? true : undefined} />
          </Field>
          <button type="submit" className={buttonClass("primary")}>
            Calcular
          </button>
        </form>
      </Card>

      {view.horizonNote && <Callout tone="info" className="mb-4">{view.horizonNote}</Callout>}
      {r.alerts.map((a) => (
        <Callout key={a.id} tone={a.severity === "danger" ? "danger" : "warning"} title={a.title} className="mb-4">
          <p>{a.detail}</p>
          <p className="mt-1 text-xs opacity-80">Regla: {a.rule}</p>
        </Callout>
      ))}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-500">Podrías gastar</p>
            <Badge tone="estimate">Estimación</Badge>
          </div>
          <p className="mt-2 text-4xl font-semibold tracking-tight">
            <Money cents={r.available} currency={ctx.currency} tone={r.available < 0n ? "auto" : "plain"} />
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {HORIZON_LABELS[horizon]}: del {formatLongDate(view.today)} al {formatLongDate(view.horizonEnd)} ({r.days} día{r.days === 1 ? "" : "s"}).
          </p>
          {r.perDay !== null && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Unos <Money cents={r.perDay} currency={ctx.currency} className="font-semibold" /> al día.
            </p>
          )}
          {view.nextIncome && horizon !== "proximo-ingreso" && (
            <p className="mt-3 text-xs text-slate-500">Próximo ingreso previsto: {formatDate(view.nextIncome)}.</p>
          )}
          <Explain explanation={r.explanation} />
          <p className="mt-4 text-xs text-slate-500">
            No es una garantía de solvencia: depende de que tus previsiones sean completas. Puedes cambiar la reserva mínima en{" "}
            <Link href="/ajustes" className="font-medium text-brand-700 hover:underline">
              Ajustes
            </Link>
            {ctx.minimumReserveCents > 0n ? <> (ahora <Money cents={ctx.minimumReserveCents} currency={ctx.currency} />)</> : " (ahora 0 €)"}.
          </p>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Saldo previsto" description="Saldo total aplicando tus previsiones pendientes en su fecha." />
            <CardBody>
              <ForecastChart data={chart} reserve={centsToChartNumber(ctx.minimumReserveCents)} />
              {r.lowest && (
                <p className="mt-2 text-sm text-slate-600">
                  Punto más bajo: <Money cents={r.lowest.balance} currency={ctx.currency} tone={r.lowest.balance < 0n ? "auto" : "plain"} className="font-semibold" /> el {formatDate(r.lowest.date)}.
                </p>
              )}
            </CardBody>
          </Card>

          {r.warnings.length > 0 && (
            <Callout tone="warning" title="Ten en cuenta">
              <ul className="list-disc space-y-1 pl-4">
                {r.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Callout>
          )}

          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <span>
                Ingresos previstos <Money cents={r.expectedIncome} currency={ctx.currency} tone="income" className="font-medium" /> · gastos previstos{" "}
                <Money cents={r.expectedExpense} currency={ctx.currency} tone="expense" className="font-medium" />
              </span>
              <Link href="/calendario" className="font-medium text-brand-700 hover:underline">
                Revisar el calendario
              </Link>
            </CardBody>
          </Card>
          {extraReserved > 0n && (
            <p className="text-xs text-slate-500">Has apartado {centsToInput(extraReserved)} € adicionales para este cálculo (no se guarda).</p>
          )}
        </div>
      </div>
    </>
  );
}

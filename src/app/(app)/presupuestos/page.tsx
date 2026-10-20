import { ChevronLeft, ChevronRight, Gauge } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Explain } from "@/components/ui/explain";
import { Badge, EmptyState, PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { copyBudgetsAction, createBudgetAction, deleteBudgetAction, updateBudgetLimitAction } from "@/features/budgets/actions";
import { BudgetCreateForm, BudgetLimitForm } from "@/features/budgets/budget-forms";
import { addMonthsToKey, formatMonth, isMonthKey, monthKeyOf, todayIn } from "@/lib/finance/dates";
import { centsToInput, formatBp } from "@/lib/finance/money";
import { requireContext } from "@/server/context";
import { getBudgetMonth } from "@/server/services/budgets";
import { listCategories } from "@/server/services/categories";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const today = todayIn(ctx.timezone);
  const current = monthKeyOf(today);
  const month = typeof sp.mes === "string" && isMonthKey(sp.mes) ? sp.mes : current;
  const [data, categories] = await Promise.all([getBudgetMonth(ctx, month), listCategories(ctx, { kind: "EXPENSE" })]);
  const budgeted = new Set(data.budgets.map((b) => b.categoryId));
  const available = categories.filter((c) => !budgeted.has(c.id));

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Límites mensuales por categoría de gasto. Se comparan con los gastos reales registrados."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <Link href={`/presupuestos?mes=${addMonthsToKey(month, -1)}`} className={buttonClass("ghost", "sm")} aria-label="Mes anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <span className="min-w-36 px-2 text-center text-sm font-medium capitalize">{formatMonth(month)}</span>
            <Link href={`/presupuestos?mes=${addMonthsToKey(month, 1)}`} className={buttonClass("ghost", "sm")} aria-label="Mes siguiente">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {data.budgets.length > 0 && (
            <Card className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">Presupuestado</p>
                <Money cents={data.totalLimit} currency={ctx.currency} className="text-xl font-semibold" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Gastado en esas categorías</p>
                <Money cents={data.totalSpent} currency={ctx.currency} tone="expense" className="text-xl font-semibold" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Gasto sin presupuesto</p>
                <Money cents={data.unbudgetedSpent} currency={ctx.currency} className="text-xl font-semibold" />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title={`Presupuestos de ${formatMonth(month)}`} description={month === current ? "Mes en curso: gastos hasta hoy." : undefined} />
            {data.budgets.length === 0 ? (
              <EmptyState
                icon={Gauge}
                title="Sin presupuestos este mes"
                description="Añade un límite para las categorías en las que quieras controlar el gasto, o copia los del mes anterior."
                action={<ActionButton action={copyBudgetsAction.bind(null, month)}>Copiar del mes anterior</ActionButton>}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.budgets.map((b) => {
                  const tone = b.usage.status === "exceeded" ? "danger" : b.usage.status === "warning" ? "warning" : "positive";
                  return (
                    <li key={b.id} className="space-y-3 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium text-slate-900">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.categoryColor }} aria-hidden />
                          {b.categoryName}
                          {b.usage.status === "exceeded" && <Badge tone="negative">Superado</Badge>}
                          {b.usage.status === "warning" && <Badge tone="estimate">Cerca del límite</Badge>}
                          {b.categoryArchived && <Badge>Archivada</Badge>}
                        </span>
                        <span className="text-sm text-slate-600">
                          <Money cents={b.usage.spent} currency={ctx.currency} className="font-semibold text-slate-900" /> de{" "}
                          <Money cents={b.usage.limit} currency={ctx.currency} /> · {formatBp(b.usage.consumedBp, 0)}
                        </span>
                      </div>
                      <Progress valueBp={b.usage.consumedBp} tone={tone} label={`Consumo del presupuesto de ${b.categoryName}`} />
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className={b.usage.remaining < 0n ? "text-negative-700" : "text-slate-600"}>
                          {b.usage.remaining < 0n ? "Te has pasado " : "Quedan "}
                          <Money cents={b.usage.remaining < 0n ? -b.usage.remaining : b.usage.remaining} currency={ctx.currency} className="font-medium" />
                          {b.usage.projected !== null && (
                            <span className="text-estimate-700">
                              {" "}
                              · Previsión a fin de mes: <Money cents={b.usage.projected} currency={ctx.currency} /> (estimación)
                            </span>
                          )}
                        </span>
                        <div className="flex items-start gap-2">
                          <BudgetLimitForm action={updateBudgetLimitAction.bind(null, b.id)} defaultLimit={centsToInput(b.usage.limit)} label={b.categoryName} />
                          <ActionButton action={deleteBudgetAction.bind(null, b.id)} variant="ghost" confirmText={`¿Eliminar el presupuesto de «${b.categoryName}» de este mes?`}>
                            Quitar
                          </ActionButton>
                        </div>
                      </div>
                      <Explain explanation={b.explanation} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Nuevo presupuesto" description={formatMonth(month)} />
            <CardBody>
              <BudgetCreateForm action={createBudgetAction} month={month} categories={available.map((c) => ({ id: c.id, name: c.name }))} />
            </CardBody>
          </Card>
          {data.budgets.length > 0 && (
            <Card>
              <CardBody className="space-y-3 text-sm text-slate-600">
                <p>Añade al mes actual los presupuestos del mes anterior que todavía no tengas.</p>
                <ActionButton action={copyBudgetsAction.bind(null, month)}>Copiar del mes anterior</ActionButton>
              </CardBody>
            </Card>
          )}
          <Card>
            <CardBody className="text-sm text-slate-600">
              Aviso al alcanzar el <strong>{ctx.budgetAlertThreshold} %</strong> del límite. Los presupuestos solo se comparan con gastos reales; las previsiones del calendario no cuentan.
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

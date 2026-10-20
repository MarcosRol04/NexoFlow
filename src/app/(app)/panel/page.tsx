import { ArrowDownRight, ArrowUpRight, Plus, Scale, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Explain } from "@/components/ui/explain";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { CategoryDonut, MonthlyChart } from "@/features/dashboard/charts";
import { TransactionRows } from "@/features/transactions/transaction-rows";
import { formatDate, formatLongDate, formatMonth, formatShortMonth } from "@/lib/finance/dates";
import { centsToChartNumber, formatBp } from "@/lib/finance/money";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validation/constants";
import { requireContext } from "@/server/context";
import { getDashboard, savingsRateCaption } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Panel" };

function Kpi({
  label,
  icon: Icon,
  children,
  caption,
  footer,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
  caption?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{children}</p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
      {footer}
    </Card>
  );
}

export default async function DashboardPage() {
  const ctx = await requireContext();
  const d = await getDashboard(ctx);
  const cur = ctx.currency;

  if (d.accounts.length === 0) {
    return (
      <>
        <PageHeader title={`Hola, ${ctx.userName.split(" ")[0]}`} description={formatLongDate(d.today)} />
        <Card>
          <EmptyState
            icon={Wallet}
            title="Empieza creando tu primera cuenta"
            description="Añade tu cuenta corriente, una de ahorro o el efectivo que llevas, con su saldo actual. Después podrás registrar movimientos."
            action={<ButtonLink href="/cuentas/nueva">Crear una cuenta</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const monthly = d.series.map((p) => ({
    label: formatShortMonth(p.month),
    ingresos: centsToChartNumber(p.income),
    gastos: centsToChartNumber(p.expense),
  }));
  const donut = d.byCategory.map((c) => ({ name: c.name, value: centsToChartNumber(c.total), color: c.color }));

  return (
    <>
      <PageHeader
        title={`Hola, ${ctx.userName.split(" ")[0]}`}
        description={`${formatLongDate(d.today)} · Datos de ${formatMonth(d.monthKey)} hasta hoy`}
        actions={
          <>
            <ButtonLink href="/movimientos/nuevo?tipo=gasto" variant="secondary">
              <Plus className="h-4 w-4" aria-hidden /> Gasto
            </ButtonLink>
            <ButtonLink href="/movimientos/nuevo?tipo=ingreso">
              <Plus className="h-4 w-4" aria-hidden /> Ingreso
            </ButtonLink>
          </>
        }
      />

      {d.alerts.length > 0 && (
        <section aria-label="Avisos" className="mb-6 space-y-2">
          {d.alerts.map((a) => (
            <Callout key={a.id} tone={a.severity === "danger" ? "danger" : a.severity === "warning" ? "warning" : "info"} title={a.title}>
              <p>{a.detail}</p>
              <p className="mt-1 text-xs opacity-80">Regla: {a.rule}</p>
            </Callout>
          ))}
        </section>
      )}

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Saldo total registrado" icon={Wallet} caption={`${d.accounts.length} cuenta(s) activa(s)`} footer={<Explain explanation={d.totalExplanation} />}>
          <Money cents={d.totalBalance} currency={cur} tone={d.totalBalance < 0n ? "auto" : "plain"} />
        </Kpi>
        <Kpi label="Ingresos del mes" icon={ArrowUpRight} caption={`${d.month.incomeCount} movimiento(s)`}>
          <Money cents={d.month.income} currency={cur} tone="income" />
        </Kpi>
        <Kpi label="Gastos del mes" icon={ArrowDownRight} caption={`${d.month.expenseCount} movimiento(s)`}>
          <Money cents={d.month.expense} currency={cur} tone="expense" />
        </Kpi>
        <Kpi
          label="Balance del mes"
          icon={Scale}
          caption={
            <>
              Tasa de ahorro: <strong className="font-semibold text-slate-700">{formatBp(d.month.savingsRateBp)}</strong> · {savingsRateCaption(d.month)}
            </>
          }
          footer={<Explain explanation={d.monthExplanation} />}
        >
          <Money cents={d.month.net} currency={cur} tone="auto" signed />
        </Kpi>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Evolución mensual" description="Ingresos y gastos reales de los últimos 6 meses (el mes actual, hasta hoy)." />
          <CardBody>
            {d.hasAnyTransaction ? (
              <MonthlyChart data={monthly} currency={cur} />
            ) : (
              <EmptyState title="Todavía no hay movimientos" description="Registra ingresos y gastos para ver su evolución." />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Gastos por categoría" description={`${formatMonth(d.monthKey)}, hasta hoy`} />
          <CardBody>
            {d.byCategory.length === 0 ? (
              <EmptyState title="Sin gastos este mes" />
            ) : (
              <>
                <CategoryDonut data={donut} />
                <ul className="mt-3 space-y-2">
                  {d.byCategory.slice(0, 6).map((c) => (
                    <li key={c.categoryId ?? "none"} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                        <span className="truncate text-slate-700">{c.name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{formatBp(c.shareBp, 0)}</span>
                        <Money cents={c.total} currency={cur} className="font-medium" />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Presupuestos del mes"
            action={
              <Link href="/presupuestos" className="text-sm font-medium text-brand-700 hover:underline">
                Ver
              </Link>
            }
          />
          {d.budgets.length === 0 ? (
            <EmptyState title="Sin presupuestos" description="Fija límites por categoría para recibir avisos." action={<ButtonLink href="/presupuestos" variant="secondary" size="sm">Crear presupuesto</ButtonLink>} />
          ) : (
            <ul className="space-y-4 px-5 py-4">
              {d.budgets.slice(0, 4).map((b) => (
                <li key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-slate-800">{b.categoryName}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      <Money cents={b.usage.spent} currency={cur} /> / <Money cents={b.usage.limit} currency={cur} />
                    </span>
                  </div>
                  <Progress
                    valueBp={b.usage.consumedBp}
                    tone={b.usage.status === "exceeded" ? "danger" : b.usage.status === "warning" ? "warning" : "positive"}
                    label={`Consumo del presupuesto de ${b.categoryName}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Objetivos de ahorro"
            action={
              <Link href="/objetivos" className="text-sm font-medium text-brand-700 hover:underline">
                Ver
              </Link>
            }
          />
          {d.goals.length === 0 ? (
            <EmptyState title="Sin objetivos activos" action={<ButtonLink href="/objetivos/nuevo" variant="secondary" size="sm">Crear objetivo</ButtonLink>} />
          ) : (
            <ul className="space-y-4 px-5 py-4">
              {d.goals.slice(0, 3).map((g) => (
                <li key={g.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/objetivos/${g.id}`} className="truncate font-medium text-slate-800 hover:underline">
                      {g.name}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">{formatBp(g.progress.progressBp, 0)}</span>
                  </div>
                  <Progress valueBp={g.progress.progressBp} tone={g.progress.reached ? "positive" : "brand"} label={`Progreso de ${g.name}`} />
                  <p className="text-xs text-slate-500">
                    <Money cents={g.progress.saved} currency={cur} /> de <Money cents={g.targetCents} currency={cur} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Próximos compromisos"
            description="Previsiones de los próximos 30 días"
            action={
              <Link href="/calendario" className="text-sm font-medium text-brand-700 hover:underline">
                Calendario
              </Link>
            }
          />
          {d.overdueCount > 0 && (
            <p className="border-b border-slate-100 bg-estimate-50 px-5 py-2 text-xs text-estimate-700">
              {d.overdueCount} previsión(es) vencida(s) sin registrar.
            </p>
          )}
          {d.upcoming.length === 0 ? (
            <EmptyState title="Nada previsto" description="Añade pagos y cobros habituales al calendario." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.upcoming.slice(0, 6).map((o) => (
                <li key={`${o.itemId}-${o.date}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{o.description}</p>
                    <p className="text-xs text-slate-500">{formatDate(o.date)} · <span className="text-estimate-700">previsto</span></p>
                  </div>
                  <Money cents={o.type === "EXPENSE" ? -o.amountCents : o.amountCents} currency={cur} tone={o.type === "EXPENSE" ? "expense" : "income"} signed className="font-semibold" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Últimos movimientos"
            action={
              <Link href="/movimientos" className="text-sm font-medium text-brand-700 hover:underline">
                Ver todos
              </Link>
            }
          />
          {d.recent.length === 0 ? (
            <EmptyState
              title="Aún no has registrado movimientos"
              action={<ButtonLink href="/movimientos/nuevo">Registrar movimiento</ButtonLink>}
            />
          ) : (
            <TransactionRows items={d.recent} currency={cur} compact />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Cuentas"
            action={
              <Link href="/cuentas" className="text-sm font-medium text-brand-700 hover:underline">
                Gestionar
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {d.accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/cuentas/${a.id}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                    {a.name}
                  </Link>
                  <Badge className="mt-1">{ACCOUNT_TYPE_LABELS[a.type]}</Badge>
                </div>
                <Money cents={a.balanceCents} currency={cur} tone={a.balanceCents < 0n ? "auto" : "plain"} className="font-semibold" />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

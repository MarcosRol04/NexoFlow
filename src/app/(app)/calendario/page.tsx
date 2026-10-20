import { CalendarDays, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { Money } from "@/components/ui/money";
import { registerOccurrenceAction } from "@/features/calendar/actions";
import { formatDate, formatMonth, monthKeyOf } from "@/lib/finance/dates";
import { FREQUENCY_LABELS } from "@/lib/finance/schedule";
import { requireContext } from "@/server/context";
import { type OccurrenceView, getCalendarOverview } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Calendario financiero" };

function OccurrenceRow({ o, today, currency }: { o: OccurrenceView; today: string; currency: string }) {
  const canRegister = !o.registered && o.date <= today;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-20 shrink-0 text-sm text-slate-500">{formatDate(o.date).replace(/ \d{4}$/, "")}</span>
        <div className="min-w-0">
          <Link href={`/calendario/${o.itemId}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
            {o.description}
          </Link>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {o.registered ? <Badge tone="positive">Registrado</Badge> : <Badge tone="estimate">Previsto</Badge>}
            {FREQUENCY_LABELS[o.item.frequency]}
            {o.item.account ? ` · ${o.item.account.name}` : " · sin cuenta"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Money cents={o.type === "EXPENSE" ? -o.amountCents : o.amountCents} currency={currency} tone={o.type === "EXPENSE" ? "expense" : "income"} signed className="font-semibold" />
        {canRegister && (
          <ActionButton action={registerOccurrenceAction.bind(null, o.itemId, o.date)} variant="secondary">
            Registrar
          </ActionButton>
        )}
      </div>
    </li>
  );
}

export default async function CalendarPage() {
  const ctx = await requireContext();
  const { today, items, overdue, upcoming } = await getCalendarOverview(ctx, 60);

  // Agrupar las próximas por mes.
  const groups = new Map<string, OccurrenceView[]>();
  for (const o of upcoming) {
    const key = monthKeyOf(o.date);
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }

  return (
    <>
      <PageHeader
        title="Calendario financiero"
        description="Compromisos previstos: pagos y cobros que esperas. No son movimientos reales hasta que los registras."
        actions={
          <ButtonLink href="/calendario/nuevo">
            <Plus className="h-4 w-4" aria-hidden /> Nueva previsión
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Sin previsiones"
            description="Añade tus pagos y cobros habituales (alquiler, nómina, seguros, suscripciones) para estimar cuánto puedes gastar."
            action={<ButtonLink href="/calendario/nuevo">Añadir previsión</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            {overdue.length > 0 && (
              <Card>
                <CardHeader title="Vencidas sin registrar" description="Previsiones de los últimos 31 días que no has registrado como movimiento." />
                <ul className="divide-y divide-slate-100">
                  {overdue.map((o) => (
                    <OccurrenceRow key={`${o.itemId}-${o.date}`} o={o} today={today} currency={ctx.currency} />
                  ))}
                </ul>
              </Card>
            )}
            {[...groups.entries()].map(([month, list]) => (
              <Card key={month}>
                <CardHeader title={<span className="capitalize">{formatMonth(month)}</span>} description="Próximos 60 días" />
                <ul className="divide-y divide-slate-100">
                  {list.map((o) => (
                    <OccurrenceRow key={`${o.itemId}-${o.date}`} o={o} today={today} currency={ctx.currency} />
                  ))}
                </ul>
              </Card>
            ))}
            {upcoming.length === 0 && (
              <Callout tone="info">No hay previsiones en los próximos 60 días.</Callout>
            )}
          </div>

          <Card className="h-fit lg:col-span-2">
            <CardHeader title="Tus previsiones" description={`${items.length} en total`} />
            <ul className="divide-y divide-slate-100">
              {items.map((i) => (
                <li key={i.id}>
                  <Link href={`/calendario/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{i.description}</p>
                      <p className="text-xs text-slate-500">
                        {FREQUENCY_LABELS[i.frequency]} desde {formatDate(i.startDate)}
                        {i.endDate ? ` hasta ${formatDate(i.endDate)}` : ""}
                        {!i.active && " · inactiva"}
                      </p>
                    </div>
                    <Money cents={i.type === "EXPENSE" ? -i.amountCents : i.amountCents} currency={ctx.currency} tone={i.type === "EXPENSE" ? "expense" : "income"} signed className="text-sm font-semibold" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

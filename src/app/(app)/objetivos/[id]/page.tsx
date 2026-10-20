import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Explain } from "@/components/ui/explain";
import { Badge, EmptyState, PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { addGoalMovementAction, deleteGoalAction, deleteGoalMovementAction, saveGoalAction } from "@/features/goals/actions";
import { GoalForm, GoalMovementForm } from "@/features/goals/goal-forms";
import { formatDate, todayIn } from "@/lib/finance/dates";
import { centsToInput, formatBp } from "@/lib/finance/money";
import { GOAL_STATUS_LABELS } from "@/lib/validation/constants";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import { getGoal } from "@/server/services/goals";

export const metadata: Metadata = { title: "Objetivo" };

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const goal = /^[0-9a-f-]{36}$/i.test(id) ? await getGoal(ctx, id) : null;
  if (!goal) notFound();
  const accounts = await listAccounts(ctx, { includeArchived: true });
  const p = goal.progress;

  return (
    <>
      <PageHeader
        title={goal.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {GOAL_STATUS_LABELS[goal.status]}
            {goal.targetDate && <>· Fecha objetivo: {formatDate(goal.targetDate)}</>}
            {goal.linkedAccount && <>· Se guarda en {goal.linkedAccount.name}</>}
            {p.reached && <Badge tone="positive">¡Conseguido!</Badge>}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Ahorrado</p>
                <p className="text-3xl font-semibold tracking-tight">
                  <Money cents={p.saved} currency={ctx.currency} />
                </p>
              </div>
              <p className="text-sm text-slate-600">
                de <Money cents={goal.targetCents} currency={ctx.currency} className="font-medium" /> · {formatBp(p.progressBp, 1)}
              </p>
            </div>
            <Progress valueBp={p.progressBp} tone={p.reached ? "positive" : "brand"} label="Progreso del objetivo" className="mt-4 h-3" />
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Falta</dt>
                <dd className="font-semibold"><Money cents={p.remaining} currency={ctx.currency} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Necesario al mes</dt>
                <dd className="font-semibold">
                  {p.requiredMonthly !== null ? <Money cents={p.requiredMonthly} currency={ctx.currency} /> : goal.targetDate ? (p.targetDatePassed ? "Fecha pasada" : "—") : "Sin fecha objetivo"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Fecha estimada <Badge tone="estimate">Estimación</Badge></dt>
                <dd className="font-semibold">{p.reached ? "Alcanzado" : p.estimatedDate ? formatDate(p.estimatedDate) : "Sin datos suficientes"}</dd>
              </div>
            </dl>
            <Explain explanation={goal.explanation} />
          </Card>

          <Card>
            <CardHeader title="Aportaciones y retiradas" description={`${goal.movements.length} registro(s)`} />
            {goal.movements.length === 0 ? (
              <EmptyState title="Sin movimientos" description="Registra lo que vas apartando para este objetivo." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {goal.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{m.kind === "CONTRIBUTION" ? "Aportación" : "Retirada"}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(m.date)}
                        {m.note ? ` · ${m.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Money cents={m.kind === "CONTRIBUTION" ? m.amountCents : -m.amountCents} currency={ctx.currency} tone="auto" signed className="font-semibold" />
                      <ActionButton action={deleteGoalMovementAction.bind(null, m.id)} variant="ghost" confirmText="¿Eliminar este registro?">
                        Eliminar
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Registrar aportación o retirada" />
            <CardBody>
              <GoalMovementForm action={addGoalMovementAction.bind(null, goal.id)} today={todayIn(ctx.timezone)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Editar objetivo" />
            <CardBody>
              <GoalForm
                action={saveGoalAction.bind(null, goal.id)}
                accounts={accounts.filter((a) => !a.archived || a.id === goal.linkedAccount?.id).map((a) => ({ id: a.id, name: a.name }))}
                defaults={{
                  name: goal.name,
                  targetAmount: centsToInput(goal.targetCents),
                  initialAmount: centsToInput(goal.initialCents),
                  targetDate: goal.targetDate ?? "",
                  priority: goal.priority,
                  status: goal.status,
                  linkedAccountId: goal.linkedAccount?.id ?? "",
                }}
                submitLabel="Guardar cambios"
                cancelHref="/objetivos"
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3 text-sm text-slate-600">
              <p>Eliminar el objetivo borra también sus aportaciones registradas. Tus cuentas no cambian.</p>
              <ActionButton action={deleteGoalAction.bind(null, goal.id)} variant="danger" confirmText={`¿Eliminar el objetivo «${goal.name}»?`}>
                Eliminar objetivo
              </ActionButton>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

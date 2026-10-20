import { Plus, Target } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Callout, EmptyState, PageHeader } from "@/components/ui/feedback";
import { GoalSummary } from "@/features/goals/goal-card";
import { requireContext } from "@/server/context";
import { listGoals } from "@/server/services/goals";

export const metadata: Metadata = { title: "Objetivos de ahorro" };

export default async function GoalsPage() {
  const ctx = await requireContext();
  const goals = await listGoals(ctx);
  const active = goals.filter((g) => g.status === "ACTIVE" || g.status === "PAUSED");
  const closed = goals.filter((g) => g.status === "COMPLETED" || g.status === "CANCELLED");

  return (
    <>
      <PageHeader
        title="Objetivos de ahorro"
        description="Metas que quieres alcanzar. Registra lo que vas apartando para ver tu progreso y el ritmo necesario."
        actions={
          <ButtonLink href="/objetivos/nuevo">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo objetivo
          </ButtonLink>
        }
      />
      <Callout tone="info" className="mb-6">
        Los objetivos no son dinero adicional: no se suman a tus saldos. Sirven para seguir cuánto has apartado para cada meta.
      </Callout>
      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="Aún no tienes objetivos"
            description="Por ejemplo: un fondo de emergencia, unas vacaciones o la entrada de un coche."
            action={<ButtonLink href="/objetivos/nuevo">Crear objetivo</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((g) => (
              <GoalSummary key={g.id} goal={g} currency={ctx.currency} />
            ))}
          </div>
          {closed.length > 0 && (
            <>
              <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500">Completados y cancelados</h2>
              <div className="grid gap-4 opacity-80 md:grid-cols-2 xl:grid-cols-3">
                {closed.map((g) => (
                  <GoalSummary key={g.id} goal={g} currency={ctx.currency} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

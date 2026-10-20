import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/finance/dates";
import { formatBp } from "@/lib/finance/money";
import { GOAL_PRIORITY_LABELS, GOAL_STATUS_LABELS } from "@/lib/validation/constants";
import type { GoalView } from "@/server/services/goals";

export function GoalSummary({ goal, currency }: { goal: GoalView; currency: string }) {
  const p = goal.progress;
  return (
    <Link href={`/objetivos/${goal.id}`} className="block space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-500/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{goal.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={goal.status === "ACTIVE" ? "brand" : "neutral"}>{GOAL_STATUS_LABELS[goal.status]}</Badge>
            <Badge>Prioridad {GOAL_PRIORITY_LABELS[goal.priority].toLowerCase()}</Badge>
            {p.reached && <Badge tone="positive">¡Conseguido!</Badge>}
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-700">{formatBp(p.progressBp, 0)}</span>
      </div>
      <Progress valueBp={p.progressBp} tone={p.reached ? "positive" : "brand"} label={`Progreso de ${goal.name}`} />
      <p className="text-sm text-slate-600">
        <Money cents={p.saved} currency={currency} className="font-medium text-slate-900" /> de <Money cents={goal.targetCents} currency={currency} />
        {!p.reached && (
          <>
            {" "}· faltan <Money cents={p.remaining} currency={currency} />
          </>
        )}
      </p>
      {!p.reached && (
        <p className="text-xs text-slate-500">
          {p.requiredMonthly !== null && goal.targetDate ? (
            <>
              Necesitas <Money cents={p.requiredMonthly} currency={currency} className="font-medium text-slate-700" /> al mes hasta el {formatDate(goal.targetDate)}.
            </>
          ) : p.targetDatePassed ? (
            <span className="text-negative-700">La fecha objetivo ya ha pasado.</span>
          ) : p.estimatedDate ? (
            <span className="text-estimate-700">Al ritmo reciente lo alcanzarías hacia el {formatDate(p.estimatedDate)} (estimación).</span>
          ) : (
            "Sin fecha objetivo ni aportaciones recientes para estimar."
          )}
        </p>
      )}
    </Link>
  );
}

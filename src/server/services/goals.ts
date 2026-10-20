import "server-only";
import { prisma } from "@/lib/db/prisma";
import { dbDateToIso, isoToDbDate, todayIn } from "@/lib/finance/dates";
import { type GoalProgress, explainGoal, goalProgress } from "@/lib/finance/goals";
import type { Explanation } from "@/lib/finance/ledger";
import { centsToDecimalString, decimalToCents } from "@/lib/finance/money";
import type { GoalFormInput, GoalMovementFormInput } from "@/lib/validation/finance";
import type { AppContext } from "../context";
import { DomainError, NotFoundError } from "../errors";

export interface GoalMovementView {
  id: string;
  kind: "CONTRIBUTION" | "WITHDRAWAL";
  amountCents: bigint;
  date: string;
  note: string;
}

export interface GoalView {
  id: string;
  name: string;
  targetCents: bigint;
  initialCents: bigint;
  targetDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  linkedAccount: { id: string; name: string } | null;
  movements: GoalMovementView[];
  progress: GoalProgress;
  explanation: Explanation;
}

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
const STATUS_ORDER = { ACTIVE: 0, PAUSED: 1, COMPLETED: 2, CANCELLED: 3 } as const;

export async function listGoals(ctx: AppContext, options: { onlyActive?: boolean } = {}): Promise<GoalView[]> {
  const today = todayIn(ctx.timezone);
  const rows = await prisma.savingsGoal.findMany({
    where: { workspaceId: ctx.workspaceId, ...(options.onlyActive ? { status: "ACTIVE" } : {}) },
    include: {
      movements: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
      linkedAccount: { select: { id: true, name: true } },
    },
  });
  return rows
    .map((g) => {
      const movements: GoalMovementView[] = g.movements.map((m) => ({
        id: m.id,
        kind: m.kind,
        amountCents: decimalToCents(m.amount),
        date: dbDateToIso(m.date),
        note: m.note,
      }));
      const input = {
        targetCents: decimalToCents(g.targetAmount),
        initialCents: decimalToCents(g.initialAmount),
        targetDate: g.targetDate ? dbDateToIso(g.targetDate) : null,
        movements: movements.map((m) => ({ kind: m.kind, amountCents: m.amountCents, date: m.date })),
      };
      const progress = goalProgress(input, today);
      return {
        id: g.id,
        name: g.name,
        targetCents: input.targetCents,
        initialCents: input.initialCents,
        targetDate: input.targetDate,
        priority: g.priority,
        status: g.status,
        linkedAccount: g.linkedAccount,
        movements,
        progress,
        explanation: explainGoal(input, progress, ctx.currency),
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.name.localeCompare(b.name, "es"));
}

export async function getGoal(ctx: AppContext, id: string): Promise<GoalView | null> {
  const goals = await listGoals(ctx);
  return goals.find((g) => g.id === id) ?? null;
}

async function assertLinkedAccount(ctx: AppContext, accountId: string | null) {
  if (!accountId) return;
  const a = await prisma.account.findFirst({ where: { id: accountId, workspaceId: ctx.workspaceId }, select: { id: true } });
  if (!a) throw new DomainError("Elige una de tus cuentas.", "linkedAccountId");
}

function goalData(input: GoalFormInput) {
  return {
    name: input.name,
    targetAmount: centsToDecimalString(input.targetAmount),
    initialAmount: centsToDecimalString(input.initialAmount),
    targetDate: input.targetDate ? isoToDbDate(input.targetDate) : null,
    priority: input.priority,
    status: input.status,
    linkedAccountId: input.linkedAccountId,
  };
}

export async function createGoal(ctx: AppContext, input: GoalFormInput): Promise<string> {
  await assertLinkedAccount(ctx, input.linkedAccountId);
  const g = await prisma.savingsGoal.create({ data: { workspaceId: ctx.workspaceId, ...goalData(input) }, select: { id: true } });
  return g.id;
}

export async function updateGoal(ctx: AppContext, id: string, input: GoalFormInput): Promise<void> {
  await assertLinkedAccount(ctx, input.linkedAccountId);
  const r = await prisma.savingsGoal.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: goalData(input) });
  if (r.count === 0) throw new NotFoundError("El objetivo");
}

export async function deleteGoal(ctx: AppContext, id: string): Promise<void> {
  const r = await prisma.savingsGoal.deleteMany({ where: { id, workspaceId: ctx.workspaceId } });
  if (r.count === 0) throw new NotFoundError("El objetivo");
}

export async function addGoalMovement(ctx: AppContext, goalId: string, input: GoalMovementFormInput): Promise<void> {
  if (input.date > todayIn(ctx.timezone)) throw new DomainError("La fecha no puede ser futura.", "date");
  const goal = await getGoal(ctx, goalId);
  if (!goal) throw new NotFoundError("El objetivo");
  if (input.kind === "WITHDRAWAL" && input.amount > goal.progress.saved) {
    throw new DomainError("No puedes retirar más de lo ahorrado en el objetivo.", "amount");
  }
  await prisma.goalMovement.create({
    data: {
      workspaceId: ctx.workspaceId,
      goalId: goal.id,
      kind: input.kind,
      amount: centsToDecimalString(input.amount),
      date: isoToDbDate(input.date),
      note: input.note,
    },
  });
}

export async function deleteGoalMovement(ctx: AppContext, movementId: string): Promise<void> {
  const r = await prisma.goalMovement.deleteMany({ where: { id: movementId, workspaceId: ctx.workspaceId } });
  if (r.count === 0) throw new NotFoundError("El movimiento del objetivo");
}

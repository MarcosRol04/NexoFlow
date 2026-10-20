import "server-only";
import { prisma } from "@/lib/db/prisma";
import { type BudgetUsage, budgetUsage, explainBudget } from "@/lib/finance/budgets";
import { type MonthKey, addMonthsToKey, isoToDbDate, monthRange, todayIn } from "@/lib/finance/dates";
import type { Explanation } from "@/lib/finance/ledger";
import { centsToDecimalString, decimalToCents } from "@/lib/finance/money";
import type { BudgetInput } from "@/lib/validation/finance";
import type { AppContext } from "../context";
import { DomainError, NotFoundError } from "../errors";

export interface BudgetView {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryArchived: boolean;
  usage: BudgetUsage;
  explanation: Explanation;
}

export interface BudgetMonthView {
  month: MonthKey;
  budgets: BudgetView[];
  totalLimit: bigint;
  totalSpent: bigint;
  /** Gasto del mes en categorías sin presupuesto. */
  unbudgetedSpent: bigint;
}

/** Gasto por categoría en un mes (hasta hoy si es el mes en curso). */
async function expensesByCategoryInMonth(ctx: AppContext, month: MonthKey): Promise<Map<string | null, bigint>> {
  const range = monthRange(month);
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      workspaceId: ctx.workspaceId,
      type: "EXPENSE",
      date: { gte: isoToDbDate(range.start), lt: isoToDbDate(range.endExclusive) },
    },
    _sum: { amount: true },
  });
  return new Map(groups.map((g) => [g.categoryId, g._sum.amount ? decimalToCents(g._sum.amount) : 0n]));
}

export async function getBudgetMonth(ctx: AppContext, month: MonthKey): Promise<BudgetMonthView> {
  const today = todayIn(ctx.timezone);
  const [rows, spentMap] = await Promise.all([
    prisma.budget.findMany({
      where: { workspaceId: ctx.workspaceId, month: isoToDbDate(`${month}-01`) },
      include: { category: { select: { name: true, color: true, archivedAt: true } } },
      orderBy: { category: { name: "asc" } },
    }),
    expensesByCategoryInMonth(ctx, month),
  ]);
  const budgets = rows.map((b) => {
    const usage = budgetUsage(decimalToCents(b.limitAmount), spentMap.get(b.categoryId) ?? 0n, ctx.budgetAlertThreshold, { month, today });
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      categoryColor: b.category.color,
      categoryArchived: b.category.archivedAt !== null,
      usage,
      explanation: explainBudget(b.category.name, usage, month, ctx.budgetAlertThreshold, ctx.currency),
    };
  });
  const budgeted = new Set(rows.map((b) => b.categoryId));
  let unbudgetedSpent = 0n;
  for (const [categoryId, spent] of spentMap) if (!categoryId || !budgeted.has(categoryId)) unbudgetedSpent += spent;
  return {
    month,
    budgets,
    totalLimit: budgets.reduce((a, b) => a + b.usage.limit, 0n),
    totalSpent: budgets.reduce((a, b) => a + b.usage.spent, 0n),
    unbudgetedSpent,
  };
}

async function assertExpenseCategory(ctx: AppContext, categoryId: string) {
  const c = await prisma.category.findFirst({ where: { id: categoryId, workspaceId: ctx.workspaceId } });
  if (!c) throw new DomainError("Elige una de tus categorías.", "categoryId");
  if (c.kind !== "EXPENSE") throw new DomainError("Los presupuestos solo se aplican a categorías de gasto.", "categoryId");
  if (c.archivedAt) throw new DomainError("Esa categoría está archivada.", "categoryId");
}

export async function createBudget(ctx: AppContext, input: BudgetInput): Promise<void> {
  await assertExpenseCategory(ctx, input.categoryId);
  const month = isoToDbDate(`${input.month}-01`);
  const exists = await prisma.budget.findFirst({
    where: { workspaceId: ctx.workspaceId, categoryId: input.categoryId, month },
    select: { id: true },
  });
  if (exists) throw new DomainError("Ya hay un presupuesto para esa categoría en ese mes. Edita su límite.", "categoryId");
  await prisma.budget.create({
    data: { workspaceId: ctx.workspaceId, categoryId: input.categoryId, month, limitAmount: centsToDecimalString(input.limit) },
  });
}

export async function updateBudgetLimit(ctx: AppContext, budgetId: string, limit: bigint): Promise<void> {
  const r = await prisma.budget.updateMany({
    where: { id: budgetId, workspaceId: ctx.workspaceId },
    data: { limitAmount: centsToDecimalString(limit) },
  });
  if (r.count === 0) throw new NotFoundError("El presupuesto");
}

export async function deleteBudget(ctx: AppContext, budgetId: string): Promise<void> {
  const r = await prisma.budget.deleteMany({ where: { id: budgetId, workspaceId: ctx.workspaceId } });
  if (r.count === 0) throw new NotFoundError("El presupuesto");
}

/** Copia los presupuestos del mes anterior a `month` (sin tocar los que ya existan). */
export async function copyBudgetsFromPreviousMonth(ctx: AppContext, month: MonthKey): Promise<number> {
  const previous = await prisma.budget.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      month: isoToDbDate(`${addMonthsToKey(month, -1)}-01`),
      category: { archivedAt: null },
    },
  });
  if (previous.length === 0) throw new DomainError("El mes anterior no tiene presupuestos que copiar.");
  const result = await prisma.budget.createMany({
    data: previous.map((b) => ({
      workspaceId: ctx.workspaceId,
      categoryId: b.categoryId,
      month: isoToDbDate(`${month}-01`),
      limitAmount: b.limitAmount,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Utilidad para la página: límite del rango de meses navegables. */
export function clampMonth(month: MonthKey, today: string): MonthKey {
  const max = addMonthsToKey(today.slice(0, 7), 12);
  return month > max ? max : month;
}

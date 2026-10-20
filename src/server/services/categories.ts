import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { CategoryInput } from "@/lib/validation/finance";
import type { CategoryView } from "@/types/finance";
import type { AppContext } from "../context";
import { DomainError, NotFoundError } from "../errors";

export async function listCategories(
  ctx: AppContext,
  options: { includeArchived?: boolean; kind?: "INCOME" | "EXPENSE" } = {},
): Promise<CategoryView[]> {
  const rows = await prisma.category.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      ...(options.includeArchived ? {} : { archivedAt: null }),
      ...(options.kind ? { kind: options.kind } : {}),
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    color: c.color,
    archived: c.archivedAt !== null,
    usageCount: c._count.transactions,
  }));
}

export async function getCategory(ctx: AppContext, id: string): Promise<CategoryView | null> {
  const list = await listCategories(ctx, { includeArchived: true });
  return list.find((c) => c.id === id) ?? null;
}

async function assertUniqueName(ctx: AppContext, input: CategoryInput, exceptId?: string) {
  const clash = await prisma.category.findFirst({
    where: {
      workspaceId: ctx.workspaceId,
      kind: input.kind,
      name: { equals: input.name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new DomainError("Ya tienes una categoría con ese nombre.", "name");
}

export async function createCategory(ctx: AppContext, input: CategoryInput): Promise<string> {
  await assertUniqueName(ctx, input);
  const c = await prisma.category.create({
    data: { workspaceId: ctx.workspaceId, name: input.name, kind: input.kind, color: input.color },
    select: { id: true },
  });
  return c.id;
}

export async function updateCategory(ctx: AppContext, id: string, input: CategoryInput): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { _count: { select: { transactions: true, budgets: true, scheduledItems: true } } },
  });
  if (!existing) throw new NotFoundError("La categoría");
  const used = existing._count.transactions + existing._count.budgets + existing._count.scheduledItems;
  if (existing.kind !== input.kind && used > 0) {
    throw new DomainError("No puedes cambiar el tipo de una categoría que ya se usa.", "kind");
  }
  await assertUniqueName(ctx, input, id);
  await prisma.category.update({ where: { id }, data: { name: input.name, kind: input.kind, color: input.color } });
}

/** Archivar oculta la categoría para movimientos nuevos sin tocar los históricos. */
export async function setCategoryArchived(ctx: AppContext, id: string, archived: boolean): Promise<void> {
  const r = await prisma.category.updateMany({
    where: { id, workspaceId: ctx.workspaceId },
    data: { archivedAt: archived ? new Date() : null },
  });
  if (r.count === 0) throw new NotFoundError("La categoría");
}

export async function deleteCategory(ctx: AppContext, id: string): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: { _count: { select: { transactions: true } } },
  });
  if (!existing) throw new NotFoundError("La categoría");
  if (existing._count.transactions > 0) {
    throw new DomainError("Esta categoría tiene movimientos. Archívala para conservar tu historial.");
  }
  await prisma.category.deleteMany({ where: { id, workspaceId: ctx.workspaceId } });
}

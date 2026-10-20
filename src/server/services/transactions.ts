import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dbDateToIso, isoToDbDate, todayIn } from "@/lib/finance/dates";
import { centsToDecimalString, decimalToCents } from "@/lib/finance/money";
import type { TransactionFilters, TransactionInput, TransferInput } from "@/lib/validation/finance";
import { findAccountInWorkspace } from "@/server/repositories/accounts";
import { findTransactionInWorkspace, toTransactionView, transactionInclude } from "@/server/repositories/transactions";
import type { Paginated, TransactionView } from "@/types/finance";
import type { AppContext } from "../context";
import { DomainError, NotFoundError } from "../errors";

export const PAGE_SIZE = 25;

type Db = Prisma.TransactionClient;

// ───────────────────────────── Consulta ─────────────────────────────

function buildWhere(ctx: AppContext, f: TransactionFilters): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [{ workspaceId: ctx.workspaceId }];
  if (f.accountId) {
    and.push({ accountId: f.accountId });
  } else {
    // Sin filtro de cuenta, cada transferencia aparece una sola vez (su salida).
    and.push({ OR: [{ type: { not: "TRANSFER" } }, { transferLeg: "OUT" }] });
  }
  if (f.type) and.push({ type: f.type });
  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if (f.from) and.push({ date: { gte: isoToDbDate(f.from) } });
  if (f.to) and.push({ date: { lte: isoToDbDate(f.to) } });
  if (f.q) and.push({ description: { contains: f.q, mode: "insensitive" } });
  return { AND: and };
}

function buildOrder(sort: TransactionFilters["sort"]): Prisma.TransactionOrderByWithRelationInput[] {
  switch (sort) {
    case "date_asc":
      return [{ date: "asc" }, { createdAt: "asc" }];
    case "amount_desc":
      return [{ amount: "desc" }, { date: "desc" }];
    case "amount_asc":
      return [{ amount: "asc" }, { date: "desc" }];
    default:
      return [{ date: "desc" }, { createdAt: "desc" }];
  }
}

export async function listTransactions(ctx: AppContext, filters: TransactionFilters): Promise<Paginated<TransactionView>> {
  const where = buildWhere(ctx, filters);
  const total = await prisma.transaction.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page ?? 1, pageCount);
  const rows = await prisma.transaction.findMany({
    where,
    orderBy: buildOrder(filters.sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: transactionInclude,
  });
  return { items: rows.map(toTransactionView), total, page, pageSize: PAGE_SIZE, pageCount };
}

export async function recentTransactions(ctx: AppContext, take = 6): Promise<TransactionView[]> {
  const rows = await prisma.transaction.findMany({
    where: buildWhere(ctx, {}),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: transactionInclude,
  });
  return rows.map(toTransactionView);
}

export async function getTransaction(ctx: AppContext, id: string): Promise<TransactionView | null> {
  const row = await findTransactionInWorkspace(ctx.workspaceId, id);
  return row ? toTransactionView(row) : null;
}

export interface TransferView {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: bigint;
  date: string;
  description: string;
}

export async function getTransfer(ctx: AppContext, transferId: string): Promise<TransferView | null> {
  const t = await prisma.transfer.findFirst({ where: { id: transferId, workspaceId: ctx.workspaceId } });
  if (!t) return null;
  return {
    id: t.id,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    amountCents: decimalToCents(t.amount),
    date: dbDateToIso(t.date),
    description: t.description,
  };
}

// ───────────────────────────── Validaciones de dominio ─────────────────────────────

function assertNotFuture(ctx: AppContext, date: string) {
  if (date > todayIn(ctx.timezone)) {
    throw new DomainError("Un movimiento real no puede tener fecha futura. Para pagos previstos usa el calendario.", "date");
  }
}

/** La cuenta debe ser del espacio. Debe estar activa salvo que ya fuera la del movimiento. */
async function assertUsableAccount(ctx: AppContext, accountId: string, field: string, db: Db, currentAccountId?: string) {
  const account = await findAccountInWorkspace(ctx.workspaceId, accountId, db);
  if (!account) throw new DomainError("Elige una de tus cuentas.", field);
  if (account.archivedAt && account.id !== currentAccountId) {
    throw new DomainError("Esa cuenta está archivada.", field);
  }
  return account;
}

async function assertUsableCategory(
  ctx: AppContext,
  categoryId: string | null,
  kind: "INCOME" | "EXPENSE",
  db: Db,
  currentCategoryId?: string | null,
) {
  if (!categoryId) return;
  const category = await db.category.findFirst({ where: { id: categoryId, workspaceId: ctx.workspaceId } });
  if (!category) throw new DomainError("Elige una de tus categorías.", "categoryId");
  if (category.kind !== kind) {
    throw new DomainError(kind === "INCOME" ? "Elige una categoría de ingreso." : "Elige una categoría de gasto.", "categoryId");
  }
  if (category.archivedAt && category.id !== currentCategoryId) {
    throw new DomainError("Esa categoría está archivada.", "categoryId");
  }
}

// ───────────────────────────── Ingresos y gastos ─────────────────────────────

export async function createTransaction(ctx: AppContext, input: TransactionInput): Promise<string> {
  assertNotFuture(ctx, input.date);
  await assertUsableAccount(ctx, input.accountId, "accountId", prisma);
  await assertUsableCategory(ctx, input.categoryId, input.type, prisma);
  const row = await prisma.transaction.create({
    data: {
      workspaceId: ctx.workspaceId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: centsToDecimalString(input.amount),
      date: isoToDbDate(input.date),
      description: input.description,
    },
    select: { id: true },
  });
  return row.id;
}

export async function updateTransaction(ctx: AppContext, id: string, input: TransactionInput): Promise<void> {
  const existing = await prisma.transaction.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
  if (!existing) throw new NotFoundError("El movimiento");
  if (existing.type === "TRANSFER") throw new DomainError("Las transferencias se editan desde su propio formulario.");
  assertNotFuture(ctx, input.date);
  await assertUsableAccount(ctx, input.accountId, "accountId", prisma, existing.accountId);
  await assertUsableCategory(ctx, input.categoryId, input.type, prisma, existing.categoryId);
  await prisma.transaction.update({
    where: { id: existing.id },
    data: {
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: centsToDecimalString(input.amount),
      date: isoToDbDate(input.date),
      description: input.description,
    },
  });
}

/** Elimina un movimiento. Si es parte de una transferencia, elimina la transferencia completa. */
export async function deleteTransaction(ctx: AppContext, id: string): Promise<void> {
  const existing = await prisma.transaction.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
  if (!existing) throw new NotFoundError("El movimiento");
  if (existing.transferId) {
    await prisma.transfer.deleteMany({ where: { id: existing.transferId, workspaceId: ctx.workspaceId } });
  } else {
    await prisma.transaction.deleteMany({ where: { id: existing.id, workspaceId: ctx.workspaceId } });
  }
}

// ───────────────────────────── Transferencias ─────────────────────────────
// Se crean y modifican en una transacción de base de datos: la transferencia y
// sus dos movimientos (salida y entrada) se guardan juntos o no se guarda nada.
// Además, un disparador diferido de PostgreSQL rechaza cualquier transferencia
// descuadrada al confirmar.

export async function createTransfer(ctx: AppContext, input: TransferInput): Promise<string> {
  assertNotFuture(ctx, input.date);
  return prisma.$transaction(async (tx) => {
    await assertUsableAccount(ctx, input.fromAccountId, "fromAccountId", tx);
    await assertUsableAccount(ctx, input.toAccountId, "toAccountId", tx);
    const amount = centsToDecimalString(input.amount);
    const date = isoToDbDate(input.date);
    const transfer = await tx.transfer.create({
      data: {
        workspaceId: ctx.workspaceId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount,
        date,
        description: input.description,
      },
      select: { id: true },
    });
    const common = { workspaceId: ctx.workspaceId, transferId: transfer.id, type: "TRANSFER" as const, amount, date, description: input.description };
    await tx.transaction.createMany({
      data: [
        { ...common, accountId: input.fromAccountId, transferLeg: "OUT" },
        { ...common, accountId: input.toAccountId, transferLeg: "IN" },
      ],
    });
    return transfer.id;
  });
}

export async function updateTransfer(ctx: AppContext, transferId: string, input: TransferInput): Promise<void> {
  assertNotFuture(ctx, input.date);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transfer.findFirst({ where: { id: transferId, workspaceId: ctx.workspaceId } });
    if (!existing) throw new NotFoundError("La transferencia");
    await assertUsableAccount(ctx, input.fromAccountId, "fromAccountId", tx, existing.fromAccountId);
    await assertUsableAccount(ctx, input.toAccountId, "toAccountId", tx, existing.toAccountId);
    const amount = centsToDecimalString(input.amount);
    const date = isoToDbDate(input.date);
    await tx.transfer.update({
      where: { id: existing.id },
      data: { fromAccountId: input.fromAccountId, toAccountId: input.toAccountId, amount, date, description: input.description },
    });
    const common = { amount, date, description: input.description };
    const out = await tx.transaction.updateMany({
      where: { transferId: existing.id, workspaceId: ctx.workspaceId, transferLeg: "OUT" },
      data: { ...common, accountId: input.fromAccountId },
    });
    const inn = await tx.transaction.updateMany({
      where: { transferId: existing.id, workspaceId: ctx.workspaceId, transferLeg: "IN" },
      data: { ...common, accountId: input.toAccountId },
    });
    if (out.count !== 1 || inn.count !== 1) throw new DomainError("La transferencia está incompleta y no se puede editar.");
  });
}

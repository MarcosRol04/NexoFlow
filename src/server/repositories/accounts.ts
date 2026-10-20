import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { type AccountSums, EMPTY_SUMS } from "@/lib/finance/ledger";
import { decimalToCents } from "@/lib/finance/money";

// Acceso a datos de cuentas. TODAS las funciones exigen el workspaceId: no hay
// forma de consultar una cuenta sin indicar a qué espacio pertenece.

type Db = Prisma.TransactionClient;

export function findAccountInWorkspace(workspaceId: string, accountId: string, db: Db = prisma) {
  return db.account.findFirst({ where: { id: accountId, workspaceId } });
}

export function listAccountRows(workspaceId: string, options: { includeArchived?: boolean } = {}, db: Db = prisma) {
  return db.account.findMany({
    where: { workspaceId, ...(options.includeArchived ? {} : { archivedAt: null }) },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });
}

/**
 * Sumas de movimientos por cuenta, calculadas por PostgreSQL (NUMERIC exacto).
 * Opcionalmente solo hasta una fecha (incluida).
 */
export async function sumsByAccount(workspaceId: string, upTo?: Date, db: Db = prisma): Promise<Map<string, AccountSums>> {
  const groups = await db.transaction.groupBy({
    by: ["accountId", "type", "transferLeg"],
    where: { workspaceId, ...(upTo ? { date: { lte: upTo } } : {}) },
    _sum: { amount: true },
  });
  const result = new Map<string, AccountSums>();
  for (const g of groups) {
    const sums = result.get(g.accountId) ?? { ...EMPTY_SUMS };
    const value = g._sum.amount ? decimalToCents(g._sum.amount) : 0n;
    if (g.type === "INCOME") sums.income += value;
    else if (g.type === "EXPENSE") sums.expense += value;
    else if (g.transferLeg === "IN") sums.transferIn += value;
    else sums.transferOut += value;
    result.set(g.accountId, sums);
  }
  return result;
}

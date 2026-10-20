import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { dbDateToIso, isoToDbDate } from "@/lib/finance/dates";
import type { LedgerEntry } from "@/lib/finance/ledger";
import { decimalToCents } from "@/lib/finance/money";
import type { TransactionView } from "@/types/finance";

type Db = Prisma.TransactionClient;

export const transactionInclude = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, color: true } },
  transfer: {
    select: {
      fromAccount: { select: { id: true, name: true } },
      toAccount: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.TransactionInclude;

type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export function toTransactionView(row: TransactionRow): TransactionView {
  let counterpart: TransactionView["counterpart"] = null;
  if (row.transfer) {
    counterpart = row.transferLeg === "OUT" ? row.transfer.toAccount : row.transfer.fromAccount;
  }
  return {
    id: row.id,
    type: row.type,
    transferId: row.transferId,
    transferLeg: row.transferLeg,
    amountCents: decimalToCents(row.amount),
    date: dbDateToIso(row.date),
    description: row.description,
    account: row.account,
    category: row.category,
    counterpart,
  };
}

export function findTransactionInWorkspace(workspaceId: string, id: string, db: Db = prisma) {
  return db.transaction.findFirst({ where: { id, workspaceId }, include: transactionInclude });
}

/** Movimientos reales de un periodo en formato del motor financiero. */
export async function ledgerEntries(
  workspaceId: string,
  range: { start: string; endExclusive: string },
  db: Db = prisma,
): Promise<LedgerEntry[]> {
  const rows = await db.transaction.findMany({
    where: { workspaceId, date: { gte: isoToDbDate(range.start), lt: isoToDbDate(range.endExclusive) } },
    select: { type: true, transferLeg: true, amount: true, date: true, accountId: true, categoryId: true },
  });
  return rows.map((r) => ({
    type: r.type,
    transferLeg: r.transferLeg,
    amountCents: decimalToCents(r.amount),
    date: dbDateToIso(r.date),
    accountId: r.accountId,
    categoryId: r.categoryId,
  }));
}

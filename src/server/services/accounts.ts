import "server-only";
import { prisma } from "@/lib/db/prisma";
import { dbDateToIso, isoToDbDate, todayIn } from "@/lib/finance/dates";
import { EMPTY_SUMS, balanceFromSums } from "@/lib/finance/ledger";
import { centsToDecimalString, decimalToCents } from "@/lib/finance/money";
import type { AccountInput } from "@/lib/validation/finance";
import { findAccountInWorkspace, listAccountRows, sumsByAccount } from "@/server/repositories/accounts";
import type { AccountView } from "@/types/finance";
import type { AppContext } from "../context";
import { DomainError, NotFoundError } from "../errors";

export async function listAccounts(ctx: AppContext, options: { includeArchived?: boolean } = {}): Promise<AccountView[]> {
  const [rows, sums] = await Promise.all([
    listAccountRows(ctx.workspaceId, options),
    sumsByAccount(ctx.workspaceId),
  ]);
  return rows.map((a) => {
    const initial = decimalToCents(a.initialBalance);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      initialBalanceCents: initial,
      openedOn: dbDateToIso(a.openedOn),
      archived: a.archivedAt !== null,
      balanceCents: balanceFromSums(initial, sums.get(a.id) ?? EMPTY_SUMS),
      transactionCount: a._count.transactions,
    };
  });
}

export async function getAccount(ctx: AppContext, accountId: string): Promise<AccountView | null> {
  const accounts = await listAccounts(ctx, { includeArchived: true });
  return accounts.find((a) => a.id === accountId) ?? null;
}

function assertOpenedOnNotFuture(ctx: AppContext, openedOn: string) {
  if (openedOn > todayIn(ctx.timezone)) {
    throw new DomainError("La fecha de apertura no puede ser futura.", "openedOn");
  }
}

export async function createAccount(ctx: AppContext, input: AccountInput): Promise<string> {
  assertOpenedOnNotFuture(ctx, input.openedOn);
  const account = await prisma.account.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: input.name,
      type: input.type,
      currency: ctx.currency,
      initialBalance: centsToDecimalString(input.initialBalance),
      openedOn: isoToDbDate(input.openedOn),
    },
    select: { id: true },
  });
  return account.id;
}

export async function updateAccount(ctx: AppContext, accountId: string, input: AccountInput): Promise<void> {
  assertOpenedOnNotFuture(ctx, input.openedOn);
  const existing = await findAccountInWorkspace(ctx.workspaceId, accountId);
  if (!existing) throw new NotFoundError("La cuenta");
  const earliest = await prisma.transaction.findFirst({
    where: { workspaceId: ctx.workspaceId, accountId },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  if (earliest && dbDateToIso(earliest.date) < input.openedOn) {
    throw new DomainError(
      `La cuenta tiene movimientos desde el ${dbDateToIso(earliest.date)}: la fecha de apertura no puede ser posterior.`,
      "openedOn",
    );
  }
  await prisma.account.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      type: input.type,
      initialBalance: centsToDecimalString(input.initialBalance),
      openedOn: isoToDbDate(input.openedOn),
    },
  });
}

export async function setAccountArchived(ctx: AppContext, accountId: string, archived: boolean): Promise<void> {
  const result = await prisma.account.updateMany({
    where: { id: accountId, workspaceId: ctx.workspaceId },
    data: { archivedAt: archived ? new Date() : null },
  });
  if (result.count === 0) throw new NotFoundError("La cuenta");
}

/** Solo se pueden eliminar cuentas sin movimientos; si tiene historial, se archiva. */
export async function deleteAccount(ctx: AppContext, accountId: string): Promise<void> {
  const account = await findAccountInWorkspace(ctx.workspaceId, accountId);
  if (!account) throw new NotFoundError("La cuenta");
  const [movements, transfers] = await Promise.all([
    prisma.transaction.count({ where: { workspaceId: ctx.workspaceId, accountId } }),
    prisma.transfer.count({ where: { workspaceId: ctx.workspaceId, OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] } }),
  ]);
  if (movements > 0 || transfers > 0) {
    throw new DomainError("Esta cuenta tiene movimientos. Para conservar tu historial, archívala en lugar de eliminarla.");
  }
  await prisma.account.deleteMany({ where: { id: accountId, workspaceId: ctx.workspaceId } });
}

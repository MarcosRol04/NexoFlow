import "server-only";
import { prisma } from "@/lib/db/prisma";
import { type IsoDate, addDays, dbDateToIso, isoToDbDate, todayIn } from "@/lib/finance/dates";
import { centsToDecimalString, decimalToCents } from "@/lib/finance/money";
import { type Occurrence, type ScheduledRule, expandOccurrences, occurrenceDates, occurrenceKey } from "@/lib/finance/schedule";
import type { ScheduledItemInput } from "@/lib/validation/finance";
import type { AppContext } from "../context";
import { DomainError, NotFoundError } from "../errors";

export interface ScheduledItemView extends ScheduledRule {
  account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string } | null;
  registeredCount: number;
}

export interface OccurrenceView extends Occurrence {
  registered: boolean;
  item: ScheduledItemView;
}

export async function listScheduledItems(ctx: AppContext): Promise<ScheduledItemView[]> {
  const rows = await prisma.scheduledItem.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: [{ active: "desc" }, { startDate: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: decimalToCents(r.amount),
    description: r.description,
    frequency: r.frequency,
    startDate: dbDateToIso(r.startDate),
    endDate: r.endDate ? dbDateToIso(r.endDate) : null,
    active: r.active,
    accountId: r.accountId,
    categoryId: r.categoryId,
    account: r.account,
    category: r.category,
    registeredCount: r._count.transactions,
  }));
}

export async function getScheduledItem(ctx: AppContext, id: string): Promise<ScheduledItemView | null> {
  return (await listScheduledItems(ctx)).find((i) => i.id === id) ?? null;
}

/** Ocurrencias entre dos fechas, marcando las que ya se han registrado como movimiento. */
export async function occurrencesWithStatus(ctx: AppContext, from: IsoDate, to: IsoDate, items?: ScheduledItemView[]): Promise<OccurrenceView[]> {
  const list = items ?? (await listScheduledItems(ctx));
  const byId = new Map(list.map((i) => [i.id, i]));
  const occurrences = expandOccurrences(list, from, to);
  if (occurrences.length === 0) return [];
  const registered = await prisma.transaction.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      scheduledItemId: { in: [...new Set(occurrences.map((o) => o.itemId))] },
      date: { gte: isoToDbDate(from), lte: isoToDbDate(to) },
    },
    select: { scheduledItemId: true, date: true },
  });
  const done = new Set(registered.map((r) => occurrenceKey(r.scheduledItemId ?? "", dbDateToIso(r.date))));
  return occurrences.flatMap((o) => {
    const item = byId.get(o.itemId);
    return item ? [{ ...o, registered: done.has(occurrenceKey(o.itemId, o.date)), item }] : [];
  });
}

export interface CalendarOverview {
  today: IsoDate;
  items: ScheduledItemView[];
  overdue: OccurrenceView[];
  upcoming: OccurrenceView[];
}

/** Vencidas (últimos 31 días) sin registrar y próximas (60 días). */
export async function getCalendarOverview(ctx: AppContext, days = 60): Promise<CalendarOverview> {
  const today = todayIn(ctx.timezone);
  const items = await listScheduledItems(ctx);
  const all = await occurrencesWithStatus(ctx, addDays(today, -31), addDays(today, days), items);
  return {
    today,
    items,
    overdue: all.filter((o) => o.date < today && !o.registered),
    upcoming: all.filter((o) => o.date >= today),
  };
}

async function assertRefs(ctx: AppContext, input: ScheduledItemInput) {
  if (input.accountId) {
    const a = await prisma.account.findFirst({ where: { id: input.accountId, workspaceId: ctx.workspaceId }, select: { id: true } });
    if (!a) throw new DomainError("Elige una de tus cuentas.", "accountId");
  }
  if (input.categoryId) {
    const c = await prisma.category.findFirst({ where: { id: input.categoryId, workspaceId: ctx.workspaceId }, select: { kind: true } });
    if (!c) throw new DomainError("Elige una de tus categorías.", "categoryId");
    if (c.kind !== input.type) throw new DomainError(input.type === "INCOME" ? "Elige una categoría de ingreso." : "Elige una categoría de gasto.", "categoryId");
  }
}

function itemData(input: ScheduledItemInput) {
  return {
    type: input.type,
    description: input.description,
    amount: centsToDecimalString(input.amount),
    frequency: input.frequency,
    startDate: isoToDbDate(input.startDate),
    endDate: input.endDate ? isoToDbDate(input.endDate) : null,
    accountId: input.accountId,
    categoryId: input.categoryId,
    active: input.active,
  };
}

export async function createScheduledItem(ctx: AppContext, input: ScheduledItemInput): Promise<void> {
  await assertRefs(ctx, input);
  await prisma.scheduledItem.create({ data: { workspaceId: ctx.workspaceId, ...itemData(input) } });
}

export async function updateScheduledItem(ctx: AppContext, id: string, input: ScheduledItemInput): Promise<void> {
  await assertRefs(ctx, input);
  const r = await prisma.scheduledItem.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: itemData(input) });
  if (r.count === 0) throw new NotFoundError("La previsión");
}

/** Los movimientos ya registrados desde esta previsión se conservan. */
export async function deleteScheduledItem(ctx: AppContext, id: string): Promise<void> {
  const r = await prisma.scheduledItem.deleteMany({ where: { id, workspaceId: ctx.workspaceId } });
  if (r.count === 0) throw new NotFoundError("La previsión");
}

/** Convierte una ocurrencia prevista (de hoy o pasada) en un movimiento real. */
export async function registerOccurrence(ctx: AppContext, itemId: string, date: IsoDate): Promise<void> {
  const item = await getScheduledItem(ctx, itemId);
  if (!item) throw new NotFoundError("La previsión");
  if (date > todayIn(ctx.timezone)) throw new DomainError("Solo puedes registrar previsiones de hoy o anteriores.");
  if (!occurrenceDates(item, date, date).includes(date)) throw new DomainError("Esa fecha no corresponde a esta previsión.");
  if (!item.accountId) throw new DomainError("Asigna una cuenta a esta previsión para poder registrarla.");
  const account = await prisma.account.findFirst({ where: { id: item.accountId, workspaceId: ctx.workspaceId, archivedAt: null }, select: { id: true } });
  if (!account) throw new DomainError("La cuenta de esta previsión no existe o está archivada.");
  const exists = await prisma.transaction.findFirst({
    where: { workspaceId: ctx.workspaceId, scheduledItemId: item.id, date: isoToDbDate(date) },
    select: { id: true },
  });
  if (exists) throw new DomainError("Esta previsión ya está registrada para esa fecha.");
  await prisma.transaction.create({
    data: {
      workspaceId: ctx.workspaceId,
      accountId: account.id,
      categoryId: item.categoryId ?? null,
      type: item.type,
      amount: centsToDecimalString(item.amountCents),
      date: isoToDbDate(date),
      description: item.description,
      scheduledItemId: item.id,
    },
  });
}

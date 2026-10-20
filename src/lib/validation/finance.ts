import { z } from "zod";
import { isMonthKey, isValidTimeZone } from "@/lib/finance/dates";
import { amountField, descriptionField, idField, isoDateField, nameField, optionalIdField } from "./common";
import { ACCOUNT_TYPES, CATEGORY_KINDS } from "./constants";

export const accountSchema = z.object({
  name: nameField(80),
  type: z.enum(ACCOUNT_TYPES, { error: "Elige un tipo de cuenta." }),
  // El saldo inicial puede ser negativo (descubierto) o cero.
  initialBalance: amountField({ allowNegative: true, allowZero: true }),
  openedOn: isoDateField,
});
export type AccountInput = z.infer<typeof accountSchema>;

export const categorySchema = z.object({
  name: nameField(60),
  kind: z.enum(CATEGORY_KINDS, { error: "Elige si es de ingreso o de gasto." }),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "Color no válido." }),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { error: "Elige ingreso o gasto." }),
  accountId: idField,
  categoryId: optionalIdField,
  amount: amountField(),
  date: isoDateField,
  description: descriptionField,
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const transferSchema = z
  .object({
    fromAccountId: idField,
    toAccountId: idField,
    amount: amountField(),
    date: isoDateField,
    description: descriptionField,
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "La cuenta de destino debe ser distinta de la de origen.",
    path: ["toAccountId"],
  });
export type TransferInput = z.infer<typeof transferSchema>;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

/** Filtros del listado de movimientos (vienen de la URL; lo inválido se ignora). */
export const transactionFiltersSchema = z.object({
  q: optionalText.pipe(z.string().max(100).optional()).catch(undefined),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional().catch(undefined),
  accountId: z.uuid().optional().catch(undefined),
  categoryId: z.uuid().optional().catch(undefined),
  from: isoDateField.optional().catch(undefined),
  to: isoDateField.optional().catch(undefined),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

// ───────────────────────────── Fase 2: presupuestos y objetivos ─────────────────────────────

const monthField = z
  .string({ error: "Elige un mes." })
  .trim()
  .refine((v) => isMonthKey(v), { message: "Mes no válido." });

/** Fecha opcional: "" → null. */
export const optionalIsoDateField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(isoDateField.nullable());

export const budgetSchema = z.object({
  categoryId: idField,
  month: monthField,
  limit: amountField(),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

export const budgetLimitSchema = z.object({ limit: amountField() });

export const GOAL_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const GOAL_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;

export const goalSchema = z.object({
  name: nameField(80),
  targetAmount: amountField(),
  initialAmount: amountField({ allowZero: true }),
  targetDate: optionalIsoDateField,
  priority: z.enum(GOAL_PRIORITIES, { error: "Elige una prioridad." }),
  status: z.enum(GOAL_STATUSES, { error: "Elige un estado." }),
  linkedAccountId: optionalIdField,
});
export type GoalFormInput = z.infer<typeof goalSchema>;

export const goalMovementSchema = z.object({
  kind: z.enum(["CONTRIBUTION", "WITHDRAWAL"], { error: "Elige aportación o retirada." }),
  amount: amountField(),
  date: isoDateField,
  note: descriptionField,
});
export type GoalMovementFormInput = z.infer<typeof goalMovementSchema>;

// ───────────────────────────── Fase 3: calendario ─────────────────────────────

export const FREQUENCIES = ["ONCE", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;

export const scheduledItemSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"], { error: "Elige ingreso o gasto." }),
    description: nameField(200),
    amount: amountField(),
    frequency: z.enum(FREQUENCIES, { error: "Elige una frecuencia." }),
    startDate: isoDateField,
    endDate: optionalIsoDateField,
    accountId: optionalIdField,
    categoryId: optionalIdField,
    active: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
  })
  .refine((d) => d.endDate === null || d.endDate >= d.startDate, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["endDate"],
  });
export type ScheduledItemInput = z.infer<typeof scheduledItemSchema>;

// ───────────────────────────── Preferencias ─────────────────────────────

export const preferencesSchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1, { message: "Elige una zona horaria." })
    .max(64)
    .refine((tz) => isValidTimeZone(tz), { message: "Zona horaria no válida." }),
  minimumReserve: amountField({ allowZero: true }),
  budgetAlertThreshold: z.coerce
    .number({ error: "Introduce un número." })
    .int({ message: "Introduce un número entero." })
    .min(1, { message: "Mínimo 1 %." })
    .max(100, { message: "Máximo 100 %." }),
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;

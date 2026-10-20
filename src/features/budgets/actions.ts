"use server";

import { type FormState, errorState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { budgetLimitSchema, budgetSchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { copyBudgetsFromPreviousMonth, createBudget, deleteBudget, updateBudgetLimit } from "@/server/services/budgets";

export async function createBudgetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(budgetSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("crear presupuesto", values, async () => {
    const ctx = await requireActionContext("finance:write");
    await createBudget(ctx, parsed.data);
  });
  return failure ?? { status: "success", message: "Presupuesto creado." };
}

export async function updateBudgetLimitAction(budgetId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(budgetLimitSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("actualizar presupuesto", values, async () => {
    const ctx = await requireActionContext("finance:write");
    await updateBudgetLimit(ctx, budgetId, parsed.data.limit);
  });
  return failure ?? { status: "success", message: "Límite actualizado." };
}

export async function deleteBudgetAction(budgetId: string): Promise<FormState> {
  const failure = await runAction("eliminar presupuesto", undefined, async () => {
    const ctx = await requireActionContext("finance:write");
    await deleteBudget(ctx, budgetId);
  });
  return failure ?? { status: "success", message: "Presupuesto eliminado." };
}

export async function copyBudgetsAction(month: string): Promise<FormState> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return errorState("Mes no válido.");
  let copied = 0;
  const failure = await runAction("copiar presupuestos", undefined, async () => {
    const ctx = await requireActionContext("finance:write");
    copied = await copyBudgetsFromPreviousMonth(ctx, month);
  });
  return failure ?? { status: "success", message: copied > 0 ? `${copied} presupuesto(s) copiados.` : "Ya tenías todos esos presupuestos." };
}

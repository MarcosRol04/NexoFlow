"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, errorState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { goalMovementSchema, goalSchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { toUserMessage } from "@/server/errors";
import { addGoalMovement, createGoal, deleteGoal, deleteGoalMovement, updateGoal } from "@/server/services/goals";

export async function saveGoalAction(goalId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(goalSchema, values);
  if (!parsed.ok) return parsed.state;
  const holder = { id: goalId };
  const failure = await runAction("guardar objetivo", values, async () => {
    const ctx = await requireActionContext("finance:write");
    if (goalId) await updateGoal(ctx, goalId, parsed.data);
    else holder.id = await createGoal(ctx, parsed.data);
  });
  if (failure) return failure;
  redirect(holder.id ? `/objetivos/${holder.id}` : "/objetivos");
}

export async function deleteGoalAction(goalId: string): Promise<FormState> {
  try {
    const ctx = await requireActionContext("finance:write");
    await deleteGoal(ctx, goalId);
  } catch (error) {
    return errorState(toUserMessage(error, "eliminar objetivo"));
  }
  revalidatePath("/", "layout");
  redirect("/objetivos");
}

export async function addGoalMovementAction(goalId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(goalMovementSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("registrar aportación", values, async () => {
    const ctx = await requireActionContext("finance:write");
    await addGoalMovement(ctx, goalId, parsed.data);
  });
  return failure ?? { status: "success", message: parsed.data.kind === "CONTRIBUTION" ? "Aportación registrada." : "Retirada registrada." };
}

export async function deleteGoalMovementAction(movementId: string): Promise<FormState> {
  const failure = await runAction("eliminar aportación", undefined, async () => {
    const ctx = await requireActionContext("finance:write");
    await deleteGoalMovement(ctx, movementId);
  });
  return failure ?? { status: "success" };
}

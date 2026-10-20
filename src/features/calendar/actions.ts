"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isIsoDate } from "@/lib/finance/dates";
import { type FormState, errorState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { scheduledItemSchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { toUserMessage } from "@/server/errors";
import { createScheduledItem, deleteScheduledItem, registerOccurrence, updateScheduledItem } from "@/server/services/schedule";

export async function saveScheduledItemAction(itemId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(scheduledItemSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("guardar previsión", values, async () => {
    const ctx = await requireActionContext("finance:write");
    if (itemId) await updateScheduledItem(ctx, itemId, parsed.data);
    else await createScheduledItem(ctx, parsed.data);
  });
  if (failure) return failure;
  redirect("/calendario");
}

export async function deleteScheduledItemAction(itemId: string): Promise<FormState> {
  try {
    const ctx = await requireActionContext("finance:write");
    await deleteScheduledItem(ctx, itemId);
  } catch (error) {
    return errorState(toUserMessage(error, "eliminar previsión"));
  }
  revalidatePath("/", "layout");
  redirect("/calendario");
}

export async function registerOccurrenceAction(itemId: string, date: string): Promise<FormState> {
  if (!isIsoDate(date)) return errorState("Fecha no válida.");
  const failure = await runAction("registrar previsión", undefined, async () => {
    const ctx = await requireActionContext("finance:write");
    await registerOccurrence(ctx, itemId, date);
  });
  return failure ?? { status: "success", message: "Registrado como movimiento real." };
}

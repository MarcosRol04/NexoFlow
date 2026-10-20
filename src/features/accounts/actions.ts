"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, errorState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { accountSchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { toUserMessage } from "@/server/errors";
import { createAccount, deleteAccount, setAccountArchived, updateAccount } from "@/server/services/accounts";

export async function saveAccountAction(accountId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(accountSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("guardar cuenta", values, async () => {
    const ctx = await requireActionContext("finance:write");
    if (accountId) await updateAccount(ctx, accountId, parsed.data);
    else await createAccount(ctx, parsed.data);
  });
  if (failure) return failure;
  redirect("/cuentas");
}

export async function archiveAccountAction(accountId: string, archived: boolean): Promise<FormState> {
  const failure = await runAction("archivar cuenta", undefined, async () => {
    const ctx = await requireActionContext("finance:write");
    await setAccountArchived(ctx, accountId, archived);
  });
  return failure ?? { status: "success", message: archived ? "Cuenta archivada." : "Cuenta reactivada." };
}

export async function deleteAccountAction(accountId: string): Promise<FormState> {
  try {
    const ctx = await requireActionContext("finance:write");
    await deleteAccount(ctx, accountId);
  } catch (error) {
    return errorState(toUserMessage(error, "eliminar cuenta"));
  }
  revalidatePath("/", "layout");
  redirect("/cuentas");
}

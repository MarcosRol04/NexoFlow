"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, errorState } from "@/lib/form-state";
import { transactionSchema, transferSchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { toUserMessage } from "@/server/errors";
import {
  createTransaction,
  createTransfer,
  deleteTransaction,
  updateTransaction,
  updateTransfer,
} from "@/server/services/transactions";

// Estas acciones reciben un objeto de textos desde formularios con React Hook
// Form. Se vuelven a validar aquí: la validación del navegador es solo comodidad.

function onlyStrings(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof input === "object" && input !== null) {
    for (const [k, v] of Object.entries(input)) if (typeof v === "string") out[k] = v.slice(0, 500);
  }
  return out;
}

export async function saveTransactionAction(transactionId: string | null, input: unknown): Promise<FormState> {
  const values = onlyStrings(input);
  const parsed = parseOrState(transactionSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("guardar movimiento", values, async () => {
    const ctx = await requireActionContext("finance:write");
    if (transactionId) await updateTransaction(ctx, transactionId, parsed.data);
    else await createTransaction(ctx, parsed.data);
  });
  if (failure) return failure;
  redirect("/movimientos");
}

export async function saveTransferAction(transferId: string | null, input: unknown): Promise<FormState> {
  const values = onlyStrings(input);
  const parsed = parseOrState(transferSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("guardar transferencia", values, async () => {
    const ctx = await requireActionContext("finance:write");
    if (transferId) await updateTransfer(ctx, transferId, parsed.data);
    else await createTransfer(ctx, parsed.data);
  });
  if (failure) return failure;
  redirect("/movimientos");
}

export async function deleteTransactionAction(transactionId: string): Promise<FormState> {
  try {
    const ctx = await requireActionContext("finance:write");
    await deleteTransaction(ctx, transactionId);
  } catch (error) {
    return errorState(toUserMessage(error, "eliminar movimiento"));
  }
  revalidatePath("/", "layout");
  redirect("/movimientos");
}

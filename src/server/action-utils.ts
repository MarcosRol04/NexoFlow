import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { type FormState, errorState, validationError } from "@/lib/form-state";
import { DomainError, toUserMessage } from "./errors";

/**
 * Ejecuta la lógica de una Server Action y traduce los errores a FormState.
 * Si todo va bien devuelve null: la acción decide entonces si redirige.
 * (redirect() debe llamarse FUERA de try/catch.)
 */
export async function runAction(
  context: string,
  values: Record<string, string> | undefined,
  fn: () => Promise<void>,
): Promise<FormState | null> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof DomainError && error.field) {
      return { status: "error", message: error.message, fieldErrors: { [error.field]: [error.message] }, values };
    }
    return errorState(toUserMessage(error, context), values);
  }
  revalidatePath("/", "layout");
  return null;
}

export function parseOrState<T extends z.ZodType>(
  schema: T,
  values: Record<string, string>,
): { ok: true; data: z.output<T> } | { ok: false; state: FormState } {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, state: validationError(parsed.error, values) };
  return { ok: true, data: parsed.data };
}

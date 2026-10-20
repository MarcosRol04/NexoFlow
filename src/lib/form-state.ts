import { z } from "zod";

// Estado que devuelven las Server Actions a los formularios.
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Valores enviados, para no perderlos si hay errores. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = { status: "idle" };

export function validationError(error: z.ZodError, values?: Record<string, string>): FormState {
  const flat = z.flattenError(error);
  return {
    status: "error",
    message: flat.formErrors[0] ?? "Revisa los campos marcados.",
    fieldErrors: flat.fieldErrors as Record<string, string[] | undefined>,
    values,
  };
}

export function errorState(message: string, values?: Record<string, string>): FormState {
  return { status: "error", message, values };
}

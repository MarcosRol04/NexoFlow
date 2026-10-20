import { z } from "zod";
import { isIsoDate } from "@/lib/finance/dates";
import { type ParseAmountOptions, parseAmount } from "@/lib/finance/money";

// Esquemas reutilizables. Los importes llegan como TEXTO y se convierten a
// céntimos (bigint) sin pasar por coma flotante.

export function amountField(options: ParseAmountOptions = {}) {
  return z
    .string({ error: "Introduce un importe." })
    .trim()
    .transform((value, ctx) => {
      const result = parseAmount(value, options);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.error });
        return z.NEVER;
      }
      return result.cents;
    });
}

export const isoDateField = z
  .string({ error: "Introduce una fecha." })
  .trim()
  .refine(isIsoDate, { message: "Introduce una fecha válida." });

export const idField = z.uuid({ error: "Identificador no válido." });

/** Campo de selección opcional: "" → null. */
export const optionalIdField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid({ error: "Identificador no válido." }).nullable());

export const descriptionField = z
  .string()
  .trim()
  .max(200, { message: "Máximo 200 caracteres." })
  .optional()
  .transform((v) => v ?? "");

export const nameField = (max: number) =>
  z
    .string({ error: "Este campo es obligatorio." })
    .trim()
    .min(1, { message: "Este campo es obligatorio." })
    .max(max, { message: `Máximo ${max} caracteres.` });

/** Convierte FormData en un objeto de textos (ignora ficheros). */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

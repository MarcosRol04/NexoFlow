"use server";

import type { FormState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { preferencesSchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { updatePreferences } from "@/server/services/settings";

export async function savePreferencesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(preferencesSchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("guardar preferencias", values, async () => {
    // Las preferencias son del usuario: basta con poder leer su espacio.
    const ctx = await requireActionContext("finance:read");
    await updatePreferences(ctx, parsed.data);
  });
  return failure ?? { status: "success", message: "Preferencias guardadas." };
}

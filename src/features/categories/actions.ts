"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type FormState, errorState } from "@/lib/form-state";
import { formDataToObject } from "@/lib/validation/common";
import { categorySchema } from "@/lib/validation/finance";
import { parseOrState, runAction } from "@/server/action-utils";
import { requireActionContext } from "@/server/context";
import { toUserMessage } from "@/server/errors";
import { createCategory, deleteCategory, setCategoryArchived, updateCategory } from "@/server/services/categories";

export async function saveCategoryAction(categoryId: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData);
  const parsed = parseOrState(categorySchema, values);
  if (!parsed.ok) return parsed.state;
  const failure = await runAction("guardar categoría", values, async () => {
    const ctx = await requireActionContext("finance:write");
    if (categoryId) await updateCategory(ctx, categoryId, parsed.data);
    else await createCategory(ctx, parsed.data);
  });
  if (failure) return failure;
  if (categoryId) redirect("/categorias");
  return { status: "success", message: "Categoría creada." };
}

export async function archiveCategoryAction(categoryId: string, archived: boolean): Promise<FormState> {
  const failure = await runAction("archivar categoría", undefined, async () => {
    const ctx = await requireActionContext("finance:write");
    await setCategoryArchived(ctx, categoryId, archived);
  });
  return failure ?? { status: "success", message: archived ? "Categoría archivada." : "Categoría reactivada." };
}

export async function deleteCategoryAction(categoryId: string): Promise<FormState> {
  try {
    const ctx = await requireActionContext("finance:write");
    await deleteCategory(ctx, categoryId);
  } catch (error) {
    return errorState(toUserMessage(error, "eliminar categoría"));
  }
  revalidatePath("/", "layout");
  redirect("/categorias");
}

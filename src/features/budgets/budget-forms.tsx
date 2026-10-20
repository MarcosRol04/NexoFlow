"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input, Select, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { type FormState, initialFormState } from "@/lib/form-state";

export function BudgetCreateForm({
  action,
  month,
  categories,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  month: string;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);
  if (categories.length === 0) {
    return <p className="text-sm text-slate-500">Todas tus categorías de gasto activas ya tienen presupuesto este mes.</p>;
  }
  return (
    <form ref={ref} action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="month" value={month} />
      <Field id="categoryId" label="Categoría de gasto" error={e.categoryId}>
        <Select {...ariaFor("categoryId", e.categoryId)} defaultValue={state.status === "error" ? state.values?.categoryId : ""} required>
          <option value="">Elige una categoría…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="limit" label="Límite mensual (€)" error={e.limit}>
        <Input {...ariaFor("limit", e.limit)} inputMode="decimal" autoComplete="off" placeholder="Ej.: 300" defaultValue={state.status === "error" ? state.values?.limit : ""} required />
      </Field>
      <SubmitButton>Añadir presupuesto</SubmitButton>
    </form>
  );
}

export function BudgetLimitForm({
  action,
  defaultLimit,
  label,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultLimit: string;
  label: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const e = state.fieldErrors?.limit?.[0];
  return (
    <form action={formAction} className="flex items-start gap-2" noValidate>
      <div>
        <label className="sr-only" htmlFor={`limit-${label}`}>
          Límite de {label}
        </label>
        <Input
          id={`limit-${label}`}
          name="limit"
          inputMode="decimal"
          className="h-8 w-28 text-right"
          defaultValue={state.status === "error" ? (state.values?.limit ?? defaultLimit) : defaultLimit}
          aria-invalid={e ? true : undefined}
        />
        {e && <p className="mt-1 text-xs text-negative-700">{e}</p>}
      </div>
      <SubmitButton variant="secondary" pendingText="…" className="h-8 px-3">
        Guardar
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, Input, Select, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { type FormState, initialFormState } from "@/lib/form-state";
import { CATEGORY_COLORS, CATEGORY_KINDS, CATEGORY_KIND_LABELS } from "@/lib/validation/constants";

export function CategoryForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: { name: string; kind: string; color: string };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};
  const v = state.status === "error" ? { ...defaults, ...state.values } : defaults;

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field id="name" label="Nombre" error={e.name}>
        <Input {...ariaFor("name", e.name)} required maxLength={60} defaultValue={v.name} placeholder="Ej.: Mascotas" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="kind" label="Tipo" error={e.kind}>
          <Select {...ariaFor("kind", e.kind)} defaultValue={v.kind}>
            {CATEGORY_KINDS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">Color</legend>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={v.color === c} className="peer sr-only" />
                <span
                  className="block h-6 w-6 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500"
                  style={{ backgroundColor: c }}
                />
                <span className="sr-only">Color {c}</span>
              </label>
            ))}
          </div>
          {e.color && <p className="mt-1 text-xs font-medium text-negative-700">{e.color[0]}</p>}
        </fieldset>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

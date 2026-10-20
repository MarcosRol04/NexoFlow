"use client";

import { useActionState, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { type FormState, initialFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export interface ScheduledItemDefaults {
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: string;
  frequency: string;
  startDate: string;
  endDate: string;
  accountId: string;
  categoryId: string;
  active: boolean;
}

const FREQUENCY_OPTIONS = [
  ["ONCE", "Una vez"],
  ["WEEKLY", "Semanal"],
  ["MONTHLY", "Mensual"],
  ["QUARTERLY", "Trimestral"],
  ["YEARLY", "Anual"],
] as const;

export function ScheduledItemForm({
  action,
  defaults,
  accounts,
  categories,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: ScheduledItemDefaults;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: "INCOME" | "EXPENSE" }[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const e = state.fieldErrors ?? {};
  const v = state.status === "error" && state.values ? { ...defaults, ...state.values, active: state.values.active === "on" } : defaults;
  const [type, setType] = useState<"INCOME" | "EXPENSE">(v.type === "INCOME" ? "INCOME" : "EXPENSE");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Tipo de previsión</legend>
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium",
                type === t ? (t === "EXPENSE" ? "bg-white text-negative-700 shadow-sm" : "bg-white text-positive-700 shadow-sm") : "text-slate-600",
              )}
            >
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              {t === "EXPENSE" ? "Pago previsto" : "Cobro previsto"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="description" label="Descripción" error={e.description} className="sm:col-span-2">
          <Input {...ariaFor("description", e.description)} required maxLength={200} placeholder="Ej.: Alquiler, nómina, seguro del coche" defaultValue={v.description} />
        </Field>
        <Field id="amount" label="Importe (€)" error={e.amount}>
          <Input {...ariaFor("amount", e.amount)} inputMode="decimal" required defaultValue={v.amount} />
        </Field>
        <Field id="frequency" label="Frecuencia" error={e.frequency}>
          <Select {...ariaFor("frequency", e.frequency)} defaultValue={v.frequency}>
            {FREQUENCY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="startDate" label="Primera fecha" error={e.startDate}>
          <Input {...ariaFor("startDate", e.startDate)} type="date" required defaultValue={v.startDate} />
        </Field>
        <Field id="endDate" label="Hasta (opcional)" error={e.endDate}>
          <Input {...ariaFor("endDate", e.endDate)} type="date" defaultValue={v.endDate} />
        </Field>
        <Field id="accountId" label="Cuenta" error={e.accountId} hint="Necesaria para poder registrarla luego como movimiento real.">
          <Select {...ariaFor("accountId", e.accountId, true)} defaultValue={v.accountId}>
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="categoryId" label="Categoría" error={e.categoryId}>
          <Select key={type} {...ariaFor("categoryId", e.categoryId)} defaultValue={categories.some((c) => c.id === v.categoryId && c.kind === type) ? v.categoryId : ""}>
            <option value="">Sin categoría</option>
            {categories
              .filter((c) => c.kind === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="active" defaultChecked={v.active} className="h-4 w-4 rounded border-slate-300" />
        Activa (si la desactivas, deja de contar en las previsiones)
      </label>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <ButtonLink href="/calendario" variant="ghost">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { type FormState, initialFormState } from "@/lib/form-state";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/validation/constants";

export interface AccountFormDefaults {
  name: string;
  type: string;
  initialBalance: string;
  openedOn: string;
}

export function AccountForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: AccountFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const e = state.fieldErrors ?? {};
  const v = { ...defaults, ...state.values };
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nombre" error={e.name} className="sm:col-span-2">
          <Input {...ariaFor("name", e.name)} required maxLength={80} placeholder="Ej.: Cuenta nómina" defaultValue={v.name} />
        </Field>
        <Field id="type" label="Tipo" error={e.type}>
          <Select {...ariaFor("type", e.type)} defaultValue={v.type}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="openedOn" label="Fecha de apertura" error={e.openedOn} hint="Desde cuándo registras esta cuenta.">
          <Input {...ariaFor("openedOn", e.openedOn, true)} type="date" required defaultValue={v.openedOn} />
        </Field>
        <Field
          id="initialBalance"
          label="Saldo inicial (€)"
          error={e.initialBalance}
          hint="El saldo que tenía la cuenta en la fecha de apertura. Puede ser negativo. Ej.: 1.250,30"
          className="sm:col-span-2"
        >
          <Input {...ariaFor("initialBalance", e.initialBalance, true)} inputMode="decimal" autoComplete="off" required defaultValue={v.initialBalance} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <ButtonLink href="/cuentas" variant="ghost">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}

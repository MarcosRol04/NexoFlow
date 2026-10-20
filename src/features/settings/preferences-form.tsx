"use client";

import { useActionState } from "react";
import { Field, Input, Select, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { type FormState, initialFormState } from "@/lib/form-state";

const TIMEZONES = ["Europe/Madrid", "Atlantic/Canary", "Europe/Lisbon", "Europe/London", "Europe/Paris", "UTC"];

export function PreferencesForm({
  action,
  defaults,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: { timezone: string; minimumReserve: string; budgetAlertThreshold: string };
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const e = state.fieldErrors ?? {};
  const v = state.status === "error" ? { ...defaults, ...state.values } : defaults;
  const zones = TIMEZONES.includes(defaults.timezone) ? TIMEZONES : [defaults.timezone, ...TIMEZONES];
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field id="minimumReserve" label="Reserva mínima (€)" error={e.minimumReserve} hint="Dinero que no quieres tocar. Se descuenta en «Dinero disponible» y genera avisos si tu saldo baja de ella.">
        <Input {...ariaFor("minimumReserve", e.minimumReserve, true)} inputMode="decimal" defaultValue={v.minimumReserve} />
      </Field>
      <Field id="budgetAlertThreshold" label="Aviso de presupuesto al llegar al (%)" error={e.budgetAlertThreshold}>
        <Input {...ariaFor("budgetAlertThreshold", e.budgetAlertThreshold)} type="number" min={1} max={100} defaultValue={v.budgetAlertThreshold} />
      </Field>
      <Field id="timezone" label="Zona horaria" error={e.timezone} hint="Decide qué día es «hoy» para tus cálculos.">
        <Select {...ariaFor("timezone", e.timezone, true)} defaultValue={v.timezone}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton>Guardar preferencias</SubmitButton>
    </form>
  );
}

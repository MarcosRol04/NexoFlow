"use client";

import { useActionState, useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { type FormState, initialFormState } from "@/lib/form-state";
import { GOAL_PRIORITY_LABELS, GOAL_STATUS_LABELS } from "@/lib/validation/constants";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface GoalFormDefaults {
  name: string;
  targetAmount: string;
  initialAmount: string;
  targetDate: string;
  priority: string;
  status: string;
  linkedAccountId: string;
}

export function GoalForm({
  action,
  defaults,
  accounts,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  defaults: GoalFormDefaults;
  accounts: { id: string; name: string }[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const e = state.fieldErrors ?? {};
  const v = { ...defaults, ...state.values };
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nombre" error={e.name} className="sm:col-span-2">
          <Input {...ariaFor("name", e.name)} required maxLength={80} placeholder="Ej.: Fondo de emergencia" defaultValue={v.name} />
        </Field>
        <Field id="targetAmount" label="Cantidad objetivo (€)" error={e.targetAmount}>
          <Input {...ariaFor("targetAmount", e.targetAmount)} inputMode="decimal" required defaultValue={v.targetAmount} />
        </Field>
        <Field id="initialAmount" label="Ya ahorrado al empezar (€)" error={e.initialAmount}>
          <Input {...ariaFor("initialAmount", e.initialAmount)} inputMode="decimal" defaultValue={v.initialAmount} />
        </Field>
        <Field id="targetDate" label="Fecha objetivo (opcional)" error={e.targetDate}>
          <Input {...ariaFor("targetDate", e.targetDate)} type="date" defaultValue={v.targetDate} />
        </Field>
        <Field id="priority" label="Prioridad" error={e.priority}>
          <Select {...ariaFor("priority", e.priority)} defaultValue={v.priority}>
            {Object.entries(GOAL_PRIORITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="status" label="Estado" error={e.status}>
          <Select {...ariaFor("status", e.status)} defaultValue={v.status}>
            {Object.entries(GOAL_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="linkedAccountId" label="Cuenta donde lo guardas (opcional)" error={e.linkedAccountId} hint="Solo informativo: el objetivo no suma ni resta saldo.">
          <Select {...ariaFor("linkedAccountId", e.linkedAccountId, true)} defaultValue={v.linkedAccountId}>
            <option value="">Ninguna</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <ButtonLink href={cancelHref} variant="ghost">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}

export function GoalMovementForm({ action, today }: { action: Action; today: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field id="kind" label="Tipo" error={e.kind}>
        <Select {...ariaFor("kind", e.kind)} defaultValue="CONTRIBUTION">
          <option value="CONTRIBUTION">Aportación</option>
          <option value="WITHDRAWAL">Retirada</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="amount" label="Importe (€)" error={e.amount}>
          <Input {...ariaFor("amount", e.amount)} inputMode="decimal" required />
        </Field>
        <Field id="date" label="Fecha" error={e.date}>
          <Input {...ariaFor("date", e.date)} type="date" defaultValue={today} required />
        </Field>
      </div>
      <Field id="note" label="Nota (opcional)" error={e.note}>
        <Input {...ariaFor("note", e.note)} maxLength={200} />
      </Field>
      <SubmitButton>Registrar</SubmitButton>
    </form>
  );
}

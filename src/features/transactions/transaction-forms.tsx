"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { type Path, type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-controls";
import { isIsoDate } from "@/lib/finance/dates";
import { parseAmount } from "@/lib/finance/money";
import { type FormState, initialFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

// Formularios de movimientos con React Hook Form. La validación del navegador
// es solo para dar respuesta inmediata: el servidor vuelve a validarlo todo.

const amountRule = z.string().superRefine((value, ctx) => {
  const r = parseAmount(value);
  if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
});
const dateRule = z.string().refine(isIsoDate, { message: "Introduce una fecha válida." });
const descriptionRule = z.string().max(200, { message: "Máximo 200 caracteres." });

const transactionClientSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, { message: "Elige una cuenta." }),
  categoryId: z.string(),
  amount: amountRule,
  date: dateRule,
  description: descriptionRule,
});
export type TransactionFormValues = z.infer<typeof transactionClientSchema>;

const transferClientSchema = z
  .object({
    fromAccountId: z.string().min(1, { message: "Elige la cuenta de origen." }),
    toAccountId: z.string().min(1, { message: "Elige la cuenta de destino." }),
    amount: amountRule,
    date: dateRule,
    description: descriptionRule,
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: "La cuenta de destino debe ser distinta de la de origen.",
    path: ["toAccountId"],
  });
export type TransferFormValues = z.infer<typeof transferClientSchema>;

export interface Option {
  id: string;
  name: string;
}
export interface CategoryOption extends Option {
  kind: "INCOME" | "EXPENSE";
}

type ServerAction = (input: unknown) => Promise<FormState>;

function useServerSubmit<T extends Record<string, string>>(form: UseFormReturn<T>, action: ServerAction) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(initialFormState);
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await action(values);
      // Si todo va bien, la acción redirige y no hay resultado que mostrar.
      if (!result) return;
      setState(result);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(field as Path<T>, { type: "server", message });
      }
    });
  });
  return { pending, state, onSubmit };
}

function errorProps(id: string, message?: string) {
  return {
    id,
    "aria-invalid": message ? true : undefined,
    "aria-describedby": message ? `${id}-error` : undefined,
  } as const;
}

function Actions({ pending, label }: { pending: boolean; label: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={pending}>
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? "Guardando…" : label}
      </Button>
      <ButtonLink href="/movimientos" variant="ghost">
        Cancelar
      </ButtonLink>
    </div>
  );
}

export function TransactionForm({
  action,
  accounts,
  categories,
  defaults,
  submitLabel,
  lockType = false,
}: {
  action: ServerAction;
  accounts: Option[];
  categories: CategoryOption[];
  defaults: TransactionFormValues;
  submitLabel: string;
  lockType?: boolean;
}) {
  const form = useForm<TransactionFormValues>({ resolver: zodResolver(transactionClientSchema), defaultValues: defaults });
  const { pending, state, onSubmit } = useServerSubmit(form, action);
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const type = watch("type");
  const visibleCategories = categories.filter((c) => c.kind === type);

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormMessage state={state} />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Tipo</legend>
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1" role="radiogroup">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label
              key={t}
              className={cn(
                "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium",
                type === t ? (t === "EXPENSE" ? "bg-white text-negative-700 shadow-sm" : "bg-white text-positive-700 shadow-sm") : "text-slate-600",
                lockType && type !== t && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="radio"
                value={t}
                className="sr-only"
                disabled={lockType && type !== t}
                {...register("type", { onChange: () => setValue("categoryId", "") })}
              />
              {t === "EXPENSE" ? "Gasto" : "Ingreso"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="amount" label="Importe (€)" error={errors.amount?.message}>
          <Input {...errorProps("amount", errors.amount?.message)} inputMode="decimal" autoComplete="off" placeholder="0,00" autoFocus {...register("amount")} />
        </Field>
        <Field id="date" label="Fecha" error={errors.date?.message}>
          <Input {...errorProps("date", errors.date?.message)} type="date" {...register("date")} />
        </Field>
        <Field id="accountId" label="Cuenta" error={errors.accountId?.message}>
          <Select {...errorProps("accountId", errors.accountId?.message)} {...register("accountId")}>
            <option value="">Elige una cuenta…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="categoryId" label="Categoría" error={errors.categoryId?.message}>
          <Select {...errorProps("categoryId", errors.categoryId?.message)} {...register("categoryId")}>
            <option value="">Sin categoría</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="description" label="Descripción" error={errors.description?.message} className="sm:col-span-2">
          <Input {...errorProps("description", errors.description?.message)} maxLength={200} placeholder="Ej.: Compra semanal" {...register("description")} />
        </Field>
      </div>

      <Actions pending={pending} label={submitLabel} />
    </form>
  );
}

export function TransferForm({
  action,
  accounts,
  defaults,
  submitLabel,
}: {
  action: ServerAction;
  accounts: Option[];
  defaults: TransferFormValues;
  submitLabel: string;
}) {
  const form = useForm<TransferFormValues>({ resolver: zodResolver(transferClientSchema), defaultValues: defaults });
  const { pending, state, onSubmit } = useServerSubmit(form, action);
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
        Una transferencia mueve dinero entre tus cuentas: resta en la de origen y suma en la de destino. No cuenta como
        ingreso ni como gasto y no cambia tu saldo total.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fromAccountId" label="Desde" error={errors.fromAccountId?.message}>
          <Select {...errorProps("fromAccountId", errors.fromAccountId?.message)} {...register("fromAccountId")}>
            <option value="">Cuenta de origen…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="toAccountId" label="Hacia" error={errors.toAccountId?.message}>
          <Select {...errorProps("toAccountId", errors.toAccountId?.message)} {...register("toAccountId")}>
            <option value="">Cuenta de destino…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="amount" label="Importe (€)" error={errors.amount?.message}>
          <Input {...errorProps("amount", errors.amount?.message)} inputMode="decimal" autoComplete="off" placeholder="0,00" {...register("amount")} />
        </Field>
        <Field id="date" label="Fecha" error={errors.date?.message}>
          <Input {...errorProps("date", errors.date?.message)} type="date" {...register("date")} />
        </Field>
        <Field id="description" label="Descripción" error={errors.description?.message} className="sm:col-span-2">
          <Input {...errorProps("description", errors.description?.message)} maxLength={200} placeholder="Ej.: Ahorro del mes" {...register("description")} />
        </Field>
      </div>
      <Actions pending={pending} label={submitLabel} />
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, ariaFor } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-controls";
import { initialFormState } from "@/lib/form-state";
import { PASSWORD_MIN_LENGTH_PUBLIC } from "@/lib/validation/constants";
import { loginAction, registerAction } from "./actions";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialFormState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field id="email" label="Correo electrónico" error={e.email}>
        <Input {...ariaFor("email", e.email)} type="email" autoComplete="email" required defaultValue={state.values?.email ?? ""} />
      </Field>
      <Field id="password" label="Contraseña" error={e.password}>
        <Input {...ariaFor("password", e.password)} type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Entrando…">
        Iniciar sesión
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand-700 hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialFormState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field id="name" label="Nombre" error={e.name}>
        <Input {...ariaFor("name", e.name)} autoComplete="name" required maxLength={100} defaultValue={state.values?.name ?? ""} />
      </Field>
      <Field id="email" label="Correo electrónico" error={e.email}>
        <Input {...ariaFor("email", e.email)} type="email" autoComplete="email" required defaultValue={state.values?.email ?? ""} />
      </Field>
      <Field id="password" label="Contraseña" error={e.password} hint={`Al menos ${PASSWORD_MIN_LENGTH_PUBLIC} caracteres. Mejor una frase larga que una palabra rara.`}>
        <Input {...ariaFor("password", e.password, true)} type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH_PUBLIC} />
      </Field>
      <Field id="confirmPassword" label="Repite la contraseña" error={e.confirmPassword}>
        <Input {...ariaFor("confirmPassword", e.confirmPassword)} type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/iniciar-sesion" className="font-medium text-brand-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

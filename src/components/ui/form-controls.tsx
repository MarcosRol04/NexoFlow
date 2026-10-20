"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";
import { Button } from "./button";
import { Callout } from "./feedback";

/** Botón de envío que se desactiva y muestra un indicador mientras se guarda. */
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending} className={className}>
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </Button>
  );
}

/** Mensaje general de un formulario (error o éxito). */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <Callout tone={state.status === "error" ? "danger" : "success"} role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </Callout>
  );
}

/**
 * Botón que ejecuta una acción (archivar, eliminar…) tras pedir confirmación
 * si se indica `confirmText`. Muestra el error si la acción falla.
 */
export function ActionButton({
  action,
  children,
  confirmText,
  variant = "secondary",
  size = "sm",
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  confirmText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState | null>(null);
  return (
    <div className="inline-flex flex-col items-start gap-2">
      <Button
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          startTransition(async () => {
            setResult(await action());
          });
        }}
      >
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </Button>
      {result && result.status === "error" && <FormMessage state={result} />}
    </div>
  );
}

import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100 aria-[invalid=true]:border-negative-600 aria-[invalid=true]:ring-negative-600/20";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-slate-700", className)} {...props} />;
}

/** Campo con etiqueta, ayuda y error accesibles (aria-describedby lo añade quien lo usa). */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string[] | string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !message && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {message && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-negative-700" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

/** Atributos ARIA para un control según tenga o no error. */
export function ariaFor(id: string, error?: string[] | string, hasHint = false) {
  const hasError = Array.isArray(error) ? error.length > 0 : !!error;
  return {
    id,
    name: id,
    "aria-invalid": hasError || undefined,
    "aria-describedby": hasError ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}

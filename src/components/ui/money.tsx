import { type Cents, formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

/**
 * Importe formateado para España. `tone`:
 * - "auto": verde si es positivo, rojo si es negativo.
 * - "income" / "expense": color fijo según el tipo de movimiento.
 * - "plain": sin color.
 */
export function Money({
  cents,
  currency = "EUR",
  tone = "plain",
  signed = false,
  className,
}: {
  cents: Cents;
  currency?: string;
  tone?: "auto" | "income" | "expense" | "plain";
  signed?: boolean;
  className?: string;
}) {
  const color =
    tone === "income"
      ? "text-positive-700"
      : tone === "expense"
        ? "text-negative-700"
        : tone === "auto"
          ? cents < 0n
            ? "text-negative-700"
            : cents > 0n
              ? "text-positive-700"
              : "text-slate-700"
          : "";
  return (
    <span className={cn("tabular whitespace-nowrap", color, className)}>
      {formatMoney(cents, currency, { signDisplay: signed ? "exceptZero" : "auto" })}
    </span>
  );
}

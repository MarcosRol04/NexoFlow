import { cn } from "@/lib/utils";

/** Barra de progreso accesible. `valueBp` en puntos básicos (10 000 = 100 %). */
export function Progress({
  valueBp,
  tone = "brand",
  label,
  className,
}: {
  valueBp: bigint;
  tone?: "brand" | "positive" | "warning" | "danger";
  label: string;
  className?: string;
}) {
  const pct = Number(valueBp > 10_000n ? 10_000n : valueBp < 0n ? 0n : valueBp) / 100;
  const color = {
    brand: "bg-brand-600",
    positive: "bg-positive-600",
    warning: "bg-estimate-600",
    danger: "bg-negative-600",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

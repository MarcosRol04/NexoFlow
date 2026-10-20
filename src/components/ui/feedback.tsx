import { TriangleAlert, CircleCheck, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { box: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }> = {
  info: { box: "border-brand-100 bg-brand-50 text-brand-900", icon: Info },
  success: { box: "border-emerald-200 bg-positive-50 text-positive-700", icon: CircleCheck },
  warning: { box: "border-amber-200 bg-estimate-50 text-estimate-700", icon: TriangleAlert },
  danger: { box: "border-rose-200 bg-negative-50 text-negative-700", icon: OctagonAlert },
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)} role={role}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[0.8125rem] leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "positive" | "negative" | "estimate" | "brand";
  children: React.ReactNode;
  className?: string;
}) {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    positive: "bg-positive-50 text-positive-700",
    negative: "bg-negative-50 text-negative-700",
    estimate: "bg-estimate-50 text-estimate-700",
    brand: "bg-brand-50 text-brand-700",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

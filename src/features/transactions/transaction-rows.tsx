import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/finance/dates";
import type { TransactionView } from "@/types/finance";

function Description({ t }: { t: TransactionView }) {
  if (t.type === "TRANSFER") {
    const from = t.transferLeg === "OUT" ? t.account.name : t.counterpart?.name;
    const to = t.transferLeg === "OUT" ? t.counterpart?.name : t.account.name;
    return (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-slate-900">{t.description || "Transferencia"}</span>
        <span className="flex items-center gap-1 truncate text-xs text-slate-500">
          {from} <ArrowRight className="h-3 w-3 shrink-0" aria-label="a" /> {to}
        </span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-medium text-slate-900">{t.description || t.category?.name || (t.type === "INCOME" ? "Ingreso" : "Gasto")}</span>
      <span className="truncate text-xs text-slate-500">{t.account.name}</span>
    </span>
  );
}

function CategoryTag({ t }: { t: TransactionView }) {
  if (t.type === "TRANSFER") return <Badge tone="brand">Transferencia</Badge>;
  if (!t.category) return <Badge>Sin categoría</Badge>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.category.color }} aria-hidden />
      {t.category.name}
    </span>
  );
}

function Amount({ t, currency }: { t: TransactionView; currency: string }) {
  if (t.type === "TRANSFER") {
    // Vista de una cuenta concreta: la salida resta y la entrada suma.
    const signed = t.transferLeg === "OUT" ? -t.amountCents : t.amountCents;
    return <Money cents={signed} currency={currency} className="font-semibold text-slate-700" signed />;
  }
  return (
    <Money
      cents={t.type === "EXPENSE" ? -t.amountCents : t.amountCents}
      currency={currency}
      tone={t.type === "EXPENSE" ? "expense" : "income"}
      signed
      className="font-semibold"
    />
  );
}

/** Lista de movimientos: tabla en pantallas anchas y lista en móvil. */
export function TransactionRows({ items, currency, compact = false }: { items: TransactionView[]; currency: string; compact?: boolean }) {
  return (
    <>
      <ul className={compact ? "divide-y divide-slate-100" : "divide-y divide-slate-100 md:hidden"}>
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/movimientos/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-slate-500">{formatDate(t.date).replace(/ \d{4}$/, "")}</span>
                <Description t={t} />
              </div>
              <Amount t={t} currency={currency} />
            </Link>
          </li>
        ))}
      </ul>

      {!compact && (
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">Movimientos</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-3">Fecha</th>
                <th scope="col" className="px-3 py-3">Descripción</th>
                <th scope="col" className="px-3 py-3">Categoría</th>
                <th scope="col" className="px-5 py-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDate(t.date)}</td>
                  <td className="max-w-xs px-3 py-3">
                    <Link href={`/movimientos/${t.id}`} className="block hover:underline">
                      <Description t={t} />
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <CategoryTag t={t} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Amount t={t} currency={currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

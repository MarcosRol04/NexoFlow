import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { TransactionRows } from "@/features/transactions/transaction-rows";
import { transactionFiltersSchema } from "@/lib/validation/finance";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import { listCategories } from "@/server/services/categories";
import { listTransactions } from "@/server/services/transactions";

export const metadata: Metadata = { title: "Movimientos" };

type SearchParams = Record<string, string | string[] | undefined>;

function first(sp: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value) out[k] = value;
  }
  return out;
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = first(await searchParams);
  const filters = transactionFiltersSchema.parse(raw);
  const ctx = await requireContext();
  const [result, accounts, categories] = await Promise.all([
    listTransactions(ctx, filters),
    listAccounts(ctx, { includeArchived: true }),
    listCategories(ctx, { includeArchived: true }),
  ]);
  const hasFilters = Object.entries(filters).some(([k, v]) => k !== "page" && k !== "sort" && v !== undefined);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v !== undefined && k !== "page") params.set(k, String(v));
    params.set("page", String(page));
    return `/movimientos?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Ingresos, gastos y transferencias registrados. Las transferencias aparecen una vez (salvo al filtrar por cuenta)."
        actions={
          <>
            <ButtonLink href="/movimientos/nuevo?tipo=transferencia" variant="secondary">
              <ArrowLeftRight className="h-4 w-4" aria-hidden /> Transferencia
            </ButtonLink>
            <ButtonLink href="/movimientos/nuevo">
              <Plus className="h-4 w-4" aria-hidden /> Nuevo movimiento
            </ButtonLink>
          </>
        }
      />

      <Card className="mb-6 p-4">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filtrar movimientos">
          <Field id="q" label="Buscar" className="sm:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Descripción…" className="pl-9" maxLength={100} />
            </div>
          </Field>
          <Field id="type" label="Tipo">
            <Select id="type" name="type" defaultValue={filters.type ?? ""}>
              <option value="">Todos</option>
              <option value="EXPENSE">Gastos</option>
              <option value="INCOME">Ingresos</option>
              <option value="TRANSFER">Transferencias</option>
            </Select>
          </Field>
          <Field id="sort" label="Orden">
            <Select id="sort" name="sort" defaultValue={filters.sort ?? "date_desc"}>
              <option value="date_desc">Más recientes</option>
              <option value="date_asc">Más antiguos</option>
              <option value="amount_desc">Mayor importe</option>
              <option value="amount_asc">Menor importe</option>
            </Select>
          </Field>
          <Field id="accountId" label="Cuenta">
            <Select id="accountId" name="accountId" defaultValue={filters.accountId ?? ""}>
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.archived ? " (archivada)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="categoryId" label="Categoría">
            <Select id="categoryId" name="categoryId" defaultValue={filters.categoryId ?? ""}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kind === "INCOME" ? "↑ " : "↓ "}
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="from" label="Desde">
            <Input id="from" name="from" type="date" defaultValue={filters.from ?? ""} />
          </Field>
          <Field id="to" label="Hasta">
            <Input id="to" name="to" type="date" defaultValue={filters.to ?? ""} />
          </Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className={buttonClass("primary", "sm")}>
              Aplicar filtros
            </button>
            {hasFilters && (
              <Link href="/movimientos" className={buttonClass("ghost", "sm")}>
                Quitar filtros
              </Link>
            )}
          </div>
        </form>
      </Card>

      <Card>
        {result.items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Ningún movimiento coincide con los filtros" : "Todavía no hay movimientos"}
            description={hasFilters ? "Prueba a ampliar las fechas o quitar algún filtro." : "Registra tu primer ingreso o gasto."}
            action={!hasFilters ? <ButtonLink href="/movimientos/nuevo">Nuevo movimiento</ButtonLink> : undefined}
          />
        ) : (
          <>
            <TransactionRows items={result.items} currency={ctx.currency} />
            <nav aria-label="Paginación" className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
              <span>
                {result.total} movimiento(s) · página {result.page} de {result.pageCount}
              </span>
              <span className="flex gap-2">
                {result.page > 1 ? (
                  <Link href={pageHref(result.page - 1)} className={buttonClass("secondary", "sm")} rel="prev">
                    <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
                  </Link>
                ) : null}
                {result.page < result.pageCount ? (
                  <Link href={pageHref(result.page + 1)} className={buttonClass("secondary", "sm")} rel="next">
                    Siguiente <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null}
              </span>
            </nav>
          </>
        )}
      </Card>
    </>
  );
}

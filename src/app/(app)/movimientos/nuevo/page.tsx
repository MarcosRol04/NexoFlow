import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Callout, PageHeader } from "@/components/ui/feedback";
import { saveTransactionAction, saveTransferAction } from "@/features/transactions/actions";
import { TransactionForm, TransferForm } from "@/features/transactions/transaction-forms";
import { todayIn } from "@/lib/finance/dates";
import { cn } from "@/lib/utils";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import { listCategories } from "@/server/services/categories";

export const metadata: Metadata = { title: "Nuevo movimiento" };

const TABS = [
  { key: "gasto", label: "Gasto" },
  { key: "ingreso", label: "Ingreso" },
  { key: "transferencia", label: "Transferencia" },
] as const;

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext("finance:write");
  const tipo = TABS.find((t) => t.key === sp.tipo)?.key ?? "gasto";
  const [accounts, categories] = await Promise.all([listAccounts(ctx), listCategories(ctx)]);
  const today = todayIn(ctx.timezone);
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const preferredAccount = typeof sp.cuenta === "string" && accounts.some((a) => a.id === sp.cuenta) ? sp.cuenta : (accounts[0]?.id ?? "");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuevo movimiento" />
      <nav aria-label="Tipo de movimiento" className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/movimientos/nuevo?tipo=${t.key}`}
            aria-current={tipo === t.key ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium",
              tipo === t.key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardBody>
          {accounts.length === 0 ? (
            <div className="space-y-4">
              <Callout tone="info" title="Primero necesitas una cuenta">
                Los movimientos se registran siempre en una cuenta.
              </Callout>
              <ButtonLink href="/cuentas/nueva">Crear cuenta</ButtonLink>
            </div>
          ) : tipo === "transferencia" ? (
            accounts.length < 2 ? (
              <div className="space-y-4">
                <Callout tone="info" title="Necesitas al menos dos cuentas">
                  Una transferencia mueve dinero entre dos de tus cuentas.
                </Callout>
                <ButtonLink href="/cuentas/nueva">Crear otra cuenta</ButtonLink>
              </div>
            ) : (
              <TransferForm
                action={saveTransferAction.bind(null, null)}
                accounts={accountOptions}
                defaults={{ fromAccountId: preferredAccount, toAccountId: "", amount: "", date: today, description: "" }}
                submitLabel="Registrar transferencia"
              />
            )
          ) : (
            <TransactionForm
              key={tipo}
              action={saveTransactionAction.bind(null, null)}
              accounts={accountOptions}
              categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
              defaults={{
                type: tipo === "ingreso" ? "INCOME" : "EXPENSE",
                accountId: preferredAccount,
                categoryId: "",
                amount: "",
                date: today,
                description: "",
              }}
              submitLabel={tipo === "ingreso" ? "Registrar ingreso" : "Registrar gasto"}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

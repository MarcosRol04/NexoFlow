import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { Money } from "@/components/ui/money";
import { archiveAccountAction, deleteAccountAction, saveAccountAction } from "@/features/accounts/actions";
import { AccountForm } from "@/features/accounts/account-form";
import { TransactionRows } from "@/features/transactions/transaction-rows";
import { centsToInput } from "@/lib/finance/money";
import { requireContext } from "@/server/context";
import { getAccount } from "@/server/services/accounts";
import { listTransactions } from "@/server/services/transactions";

export const metadata: Metadata = { title: "Cuenta" };

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const account = /^[0-9a-f-]{36}$/i.test(id) ? await getAccount(ctx, id) : null;
  if (!account) notFound();
  const recent = await listTransactions(ctx, { accountId: account.id });

  return (
    <>
      <PageHeader
        title={account.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Saldo actual <Money cents={account.balanceCents} currency={ctx.currency} tone={account.balanceCents < 0n ? "auto" : "plain"} className="font-semibold text-slate-900" />
            {account.archived && <Badge tone="estimate">Archivada</Badge>}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Movimientos de esta cuenta"
            description={`${recent.total} en total`}
            action={
              recent.total > recent.items.length ? (
                <Link href={`/movimientos?accountId=${account.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  Ver todos
                </Link>
              ) : undefined
            }
          />
          {recent.items.length === 0 ? (
            <EmptyState title="Sin movimientos" description="Los ingresos, gastos y transferencias de esta cuenta aparecerán aquí." />
          ) : (
            <TransactionRows items={recent.items} currency={ctx.currency} compact />
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Editar cuenta" />
            <CardBody>
              <AccountForm
                action={saveAccountAction.bind(null, account.id)}
                defaults={{
                  name: account.name,
                  type: account.type,
                  initialBalance: centsToInput(account.initialBalanceCents),
                  openedOn: account.openedOn,
                }}
                submitLabel="Guardar cambios"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Archivar o eliminar" />
            <CardBody className="space-y-4 text-sm text-slate-600">
              <p>
                Archivar oculta la cuenta para movimientos nuevos y la excluye del saldo total, pero conserva su historial.
                Solo puedes eliminar una cuenta que no tenga movimientos.
              </p>
              <div className="flex flex-wrap gap-2">
                <ActionButton action={archiveAccountAction.bind(null, account.id, !account.archived)}>
                  {account.archived ? "Reactivar cuenta" : "Archivar cuenta"}
                </ActionButton>
                <ActionButton
                  action={deleteAccountAction.bind(null, account.id)}
                  variant="danger"
                  confirmText={`¿Eliminar definitivamente la cuenta «${account.name}»? Esta acción no se puede deshacer.`}
                >
                  Eliminar
                </ActionButton>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

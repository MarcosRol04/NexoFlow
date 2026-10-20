import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { deleteTransactionAction, saveTransactionAction, saveTransferAction } from "@/features/transactions/actions";
import { TransactionForm, TransferForm } from "@/features/transactions/transaction-forms";
import { formatLongDate } from "@/lib/finance/dates";
import { centsToInput } from "@/lib/finance/money";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import { listCategories } from "@/server/services/categories";
import { getTransaction, getTransfer } from "@/server/services/transactions";

export const metadata: Metadata = { title: "Editar movimiento" };

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const tx = /^[0-9a-f-]{36}$/i.test(id) ? await getTransaction(ctx, id) : null;
  if (!tx) notFound();

  const [accounts, categories] = await Promise.all([
    listAccounts(ctx, { includeArchived: true }),
    listCategories(ctx, { includeArchived: true }),
  ]);

  const isTransfer = tx.type === "TRANSFER";
  const transfer = isTransfer && tx.transferId ? await getTransfer(ctx, tx.transferId) : null;
  if (isTransfer && !transfer) notFound();

  // Cuentas y categorías activas, más las archivadas que ya usa este movimiento.
  const usedAccountIds = new Set([tx.account.id, transfer?.fromAccountId, transfer?.toAccountId]);
  const accountOptions = accounts.filter((a) => !a.archived || usedAccountIds.has(a.id)).map((a) => ({ id: a.id, name: a.archived ? `${a.name} (archivada)` : a.name }));
  const categoryOptions = categories
    .filter((c) => !c.archived || c.id === tx.category?.id)
    .map((c) => ({ id: c.id, name: c.archived ? `${c.name} (archivada)` : c.name, kind: c.kind }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={isTransfer ? "Editar transferencia" : tx.type === "INCOME" ? "Editar ingreso" : "Editar gasto"}
        description={
          <span className="flex items-center gap-2">
            {formatLongDate(tx.date)} {tx.type === "TRANSFER" && <Badge tone="brand">Transferencia</Badge>}
          </span>
        }
      />
      <Card>
        <CardBody>
          {transfer ? (
            <TransferForm
              action={saveTransferAction.bind(null, transfer.id)}
              accounts={accountOptions}
              defaults={{
                fromAccountId: transfer.fromAccountId,
                toAccountId: transfer.toAccountId,
                amount: centsToInput(transfer.amountCents),
                date: transfer.date,
                description: transfer.description,
              }}
              submitLabel="Guardar cambios"
            />
          ) : (
            <TransactionForm
              action={saveTransactionAction.bind(null, tx.id)}
              accounts={accountOptions}
              categories={categoryOptions}
              defaults={{
                type: tx.type === "INCOME" ? "INCOME" : "EXPENSE",
                accountId: tx.account.id,
                categoryId: tx.category?.id ?? "",
                amount: centsToInput(tx.amountCents),
                date: tx.date,
                description: tx.description,
              }}
              submitLabel="Guardar cambios"
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Eliminar" description={isTransfer ? "Se eliminarán la salida y la entrada de la transferencia." : undefined} />
        <CardBody>
          <ActionButton
            action={deleteTransactionAction.bind(null, tx.id)}
            variant="danger"
            confirmText={isTransfer ? "¿Eliminar esta transferencia (ambas cuentas)?" : "¿Eliminar este movimiento?"}
          >
            {isTransfer ? "Eliminar transferencia" : "Eliminar movimiento"}
          </ActionButton>
        </CardBody>
      </Card>
    </div>
  );
}

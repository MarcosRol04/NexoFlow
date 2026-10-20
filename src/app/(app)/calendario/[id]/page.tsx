import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { deleteScheduledItemAction, saveScheduledItemAction } from "@/features/calendar/actions";
import { ScheduledItemForm } from "@/features/calendar/scheduled-item-form";
import { centsToInput } from "@/lib/finance/money";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import { listCategories } from "@/server/services/categories";
import { getScheduledItem } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Previsión" };

export default async function ScheduledItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const item = /^[0-9a-f-]{36}$/i.test(id) ? await getScheduledItem(ctx, id) : null;
  if (!item) notFound();
  const [accounts, categories] = await Promise.all([
    listAccounts(ctx, { includeArchived: true }),
    listCategories(ctx, { includeArchived: true }),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={item.description} description={`${item.registeredCount} vez/veces registrada como movimiento real`} />
      <Card>
        <CardBody>
          <ScheduledItemForm
            action={saveScheduledItemAction.bind(null, item.id)}
            accounts={accounts.filter((a) => !a.archived || a.id === item.accountId).map((a) => ({ id: a.id, name: a.name }))}
            categories={categories.filter((c) => !c.archived || c.id === item.categoryId).map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
            defaults={{
              type: item.type,
              description: item.description,
              amount: centsToInput(item.amountCents),
              frequency: item.frequency,
              startDate: item.startDate,
              endDate: item.endDate ?? "",
              accountId: item.accountId ?? "",
              categoryId: item.categoryId ?? "",
              active: item.active,
            }}
            submitLabel="Guardar cambios"
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Eliminar previsión" description="Los movimientos ya registrados desde esta previsión se conservan." />
        <CardBody>
          <ActionButton action={deleteScheduledItemAction.bind(null, item.id)} variant="danger" confirmText={`¿Eliminar la previsión «${item.description}»?`}>
            Eliminar
          </ActionButton>
        </CardBody>
      </Card>
    </div>
  );
}

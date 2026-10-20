import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { saveScheduledItemAction } from "@/features/calendar/actions";
import { ScheduledItemForm } from "@/features/calendar/scheduled-item-form";
import { todayIn } from "@/lib/finance/dates";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import { listCategories } from "@/server/services/categories";

export const metadata: Metadata = { title: "Nueva previsión" };

export default async function NewScheduledItemPage() {
  const ctx = await requireContext("finance:write");
  const [accounts, categories] = await Promise.all([listAccounts(ctx), listCategories(ctx)]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nueva previsión" description="Un pago o cobro que esperas. Se usa para estimar tu dinero disponible." />
      <Card>
        <CardBody>
          <ScheduledItemForm
            action={saveScheduledItemAction.bind(null, null)}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
            defaults={{
              type: "EXPENSE",
              description: "",
              amount: "",
              frequency: "MONTHLY",
              startDate: todayIn(ctx.timezone),
              endDate: "",
              accountId: accounts[0]?.id ?? "",
              categoryId: "",
              active: true,
            }}
            submitLabel="Guardar previsión"
          />
        </CardBody>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { saveAccountAction } from "@/features/accounts/actions";
import { AccountForm } from "@/features/accounts/account-form";
import { todayIn } from "@/lib/finance/dates";
import { requireContext } from "@/server/context";

export const metadata: Metadata = { title: "Nueva cuenta" };

export default async function NewAccountPage() {
  const ctx = await requireContext("finance:write");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nueva cuenta" description="Indica el saldo que tiene hoy (o en la fecha desde la que quieras registrar movimientos)." />
      <Card>
        <CardBody>
          <AccountForm
            action={saveAccountAction.bind(null, null)}
            defaults={{ name: "", type: "CHECKING", initialBalance: "0", openedOn: todayIn(ctx.timezone) }}
            submitLabel="Crear cuenta"
          />
        </CardBody>
      </Card>
    </div>
  );
}

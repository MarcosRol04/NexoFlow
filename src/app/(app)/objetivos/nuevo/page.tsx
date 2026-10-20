import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { saveGoalAction } from "@/features/goals/actions";
import { GoalForm } from "@/features/goals/goal-forms";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";

export const metadata: Metadata = { title: "Nuevo objetivo" };

export default async function NewGoalPage() {
  const ctx = await requireContext("finance:write");
  const accounts = await listAccounts(ctx);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuevo objetivo de ahorro" />
      <Card>
        <CardBody>
          <GoalForm
            action={saveGoalAction.bind(null, null)}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            defaults={{ name: "", targetAmount: "", initialAmount: "0", targetDate: "", priority: "MEDIUM", status: "ACTIVE", linkedAccountId: "" }}
            submitLabel="Crear objetivo"
            cancelHref="/objetivos"
          />
        </CardBody>
      </Card>
    </div>
  );
}

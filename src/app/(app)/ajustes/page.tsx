import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { savePreferencesAction } from "@/features/settings/actions";
import { PreferencesForm } from "@/features/settings/preferences-form";
import { centsToInput } from "@/lib/finance/money";
import { requireContext } from "@/server/context";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const ctx = await requireContext();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Ajustes" description={`${ctx.userName} · ${ctx.email}`} />
      <Card>
        <CardHeader title="Preferencias de cálculo" />
        <CardBody>
          <PreferencesForm
            action={savePreferencesAction}
            defaults={{
              timezone: ctx.timezone,
              minimumReserve: centsToInput(ctx.minimumReserveCents),
              budgetAlertThreshold: String(ctx.budgetAlertThreshold),
            }}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Privacidad" />
        <CardBody className="space-y-2 text-sm text-slate-600">
          <p>Tus datos se guardan solo en tu base de datos PostgreSQL. NexoFlow no los envía a terceros ni usa analítica o publicidad.</p>
          <p>Moneda del espacio: {ctx.currency}. La exportación de datos, el cambio de contraseña y la eliminación de la cuenta llegarán en la fase 4.</p>
        </CardBody>
      </Card>
    </div>
  );
}

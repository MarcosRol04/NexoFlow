import { ArrowLeftRight, Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { formatDate } from "@/lib/finance/dates";
import { totalBalance } from "@/lib/finance/ledger";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validation/constants";
import { requireContext } from "@/server/context";
import { listAccounts } from "@/server/services/accounts";
import type { AccountView } from "@/types/finance";

export const metadata: Metadata = { title: "Cuentas" };

function AccountList({ accounts, currency }: { accounts: AccountView[]; currency: string }) {
  return (
    <ul className="divide-y divide-slate-100">
      {accounts.map((a) => (
        <li key={a.id}>
          <Link href={`/cuentas/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{a.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge>{ACCOUNT_TYPE_LABELS[a.type]}</Badge>
                <span>Desde {formatDate(a.openedOn)}</span>
                <span>· {a.transactionCount} movimiento(s)</span>
              </div>
            </div>
            <div className="text-right">
              <Money cents={a.balanceCents} currency={currency} tone={a.balanceCents < 0n ? "auto" : "plain"} className="text-lg font-semibold" />
              <p className="text-xs text-slate-500">
                Saldo inicial <Money cents={a.initialBalanceCents} currency={currency} />
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AccountsPage() {
  const ctx = await requireContext();
  const accounts = await listAccounts(ctx, { includeArchived: true });
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const total = totalBalance(active.map((a) => a.balanceCents));

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="El saldo actual se calcula siempre a partir del saldo inicial y de los movimientos registrados."
        actions={
          <>
            {active.length >= 2 && (
              <ButtonLink href="/movimientos/nuevo?tipo=transferencia" variant="secondary">
                <ArrowLeftRight className="h-4 w-4" aria-hidden /> Transferir
              </ButtonLink>
            )}
            <ButtonLink href="/cuentas/nueva">
              <Plus className="h-4 w-4" aria-hidden /> Nueva cuenta
            </ButtonLink>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Cuentas activas"
          action={
            active.length > 0 ? (
              <div className="text-right">
                <p className="text-xs text-slate-500">Saldo total</p>
                <Money cents={total} currency={ctx.currency} tone={total < 0n ? "auto" : "plain"} className="font-semibold" />
              </div>
            ) : undefined
          }
        />
        {active.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No tienes cuentas activas"
            description="Crea una cuenta con su saldo actual para empezar."
            action={<ButtonLink href="/cuentas/nueva">Crear cuenta</ButtonLink>}
          />
        ) : (
          <AccountList accounts={active} currency={ctx.currency} />
        )}
      </Card>

      {archived.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Archivadas" description="No aparecen al registrar movimientos ni suman en el saldo total. Su historial se conserva." />
          <AccountList accounts={archived} currency={ctx.currency} />
        </Card>
      )}
    </>
  );
}

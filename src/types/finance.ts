// Tipos de vista que la capa de servicios entrega a la interfaz.
// Importes en céntimos (bigint) y fechas como texto ISO (AAAA-MM-DD).

import type { AccountTypeValue, CategoryKindValue } from "@/lib/validation/constants";

export type TransactionTypeValue = "INCOME" | "EXPENSE" | "TRANSFER";
export type TransferLegValue = "OUT" | "IN";

export interface AccountView {
  id: string;
  name: string;
  type: AccountTypeValue;
  currency: string;
  initialBalanceCents: bigint;
  openedOn: string;
  archived: boolean;
  balanceCents: bigint;
  transactionCount: number;
}

export interface CategoryView {
  id: string;
  name: string;
  kind: CategoryKindValue;
  color: string;
  archived: boolean;
  usageCount: number;
}

export interface TransactionView {
  id: string;
  type: TransactionTypeValue;
  transferId: string | null;
  transferLeg: TransferLegValue | null;
  amountCents: bigint;
  date: string;
  description: string;
  account: { id: string; name: string };
  category: { id: string; name: string; color: string } | null;
  /** En transferencias: la otra cuenta. */
  counterpart: { id: string; name: string } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

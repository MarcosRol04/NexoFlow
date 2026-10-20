import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/feedback";
import { saveCategoryAction } from "@/features/categories/actions";
import { CategoryForm } from "@/features/categories/category-form";
import { requireContext } from "@/server/context";
import { listCategories } from "@/server/services/categories";
import type { CategoryView } from "@/types/finance";

export const metadata: Metadata = { title: "Categorías" };

function CategoryList({ title, items }: { title: string; items: CategoryView[] }) {
  return (
    <Card>
      <CardHeader title={title} description={`${items.length} categoría(s)`} />
      {items.length === 0 ? (
        <EmptyState title="Sin categorías" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((c) => (
            <li key={c.id}>
              <Link href={`/categorias/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                  <span className="truncate text-sm font-medium text-slate-900">{c.name}</span>
                  {c.archived && <Badge tone="estimate">Archivada</Badge>}
                </span>
                <span className="text-xs text-slate-500">{c.usageCount} mov.</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function CategoriesPage() {
  const ctx = await requireContext();
  const categories = await listCategories(ctx, { includeArchived: true });
  const sort = (a: CategoryView, b: CategoryView) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name, "es");
  const expense = categories.filter((c) => c.kind === "EXPENSE").sort(sort);
  const income = categories.filter((c) => c.kind === "INCOME").sort(sort);

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Archivar una categoría la oculta para movimientos nuevos sin cambiar los movimientos antiguos."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <CategoryList title="Gastos" items={expense} />
        <CategoryList title="Ingresos" items={income} />
        <Card className="h-fit">
          <CardHeader title="Nueva categoría" />
          <CardBody>
            <CategoryForm action={saveCategoryAction.bind(null, null)} defaults={{ name: "", kind: "EXPENSE", color: "#6366f1" }} submitLabel="Crear categoría" />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

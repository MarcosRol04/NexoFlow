import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/feedback";
import { ActionButton } from "@/components/ui/form-controls";
import { archiveCategoryAction, deleteCategoryAction, saveCategoryAction } from "@/features/categories/actions";
import { CategoryForm } from "@/features/categories/category-form";
import { requireContext } from "@/server/context";
import { getCategory } from "@/server/services/categories";

export const metadata: Metadata = { title: "Categoría" };

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const category = /^[0-9a-f-]{36}$/i.test(id) ? await getCategory(ctx, id) : null;
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={category.name}
        description={
          <span className="flex items-center gap-2">
            {category.kind === "INCOME" ? "Categoría de ingreso" : "Categoría de gasto"} · {category.usageCount} movimiento(s)
            {category.archived && <Badge tone="estimate">Archivada</Badge>}
          </span>
        }
        actions={
          category.usageCount > 0 ? (
            <ButtonLink href={`/movimientos?categoryId=${category.id}`} variant="secondary">
              Ver movimientos
            </ButtonLink>
          ) : undefined
        }
      />
      <Card>
        <CardHeader title="Editar" />
        <CardBody>
          <CategoryForm
            action={saveCategoryAction.bind(null, category.id)}
            defaults={{ name: category.name, kind: category.kind, color: category.color }}
            submitLabel="Guardar cambios"
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Archivar o eliminar" />
        <CardBody className="space-y-4 text-sm text-slate-600">
          <p>Solo puedes eliminar una categoría sin movimientos. Si ya la has usado, archívala.</p>
          <div className="flex flex-wrap gap-2">
            <ActionButton action={archiveCategoryAction.bind(null, category.id, !category.archived)}>
              {category.archived ? "Reactivar" : "Archivar"}
            </ActionButton>
            <ActionButton
              action={deleteCategoryAction.bind(null, category.id)}
              variant="danger"
              confirmText={`¿Eliminar la categoría «${category.name}»?`}
            >
              Eliminar
            </ActionButton>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";

// No se muestra el detalle técnico del error para no revelar información interna.
export default function PrivateError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12">
      <Callout tone="danger" title="No se ha podido cargar esta página" role="alert">
        Puede que la base de datos no esté disponible. Comprueba que PostgreSQL está en marcha y vuelve a intentarlo.
      </Callout>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}

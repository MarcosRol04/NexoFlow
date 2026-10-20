import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-slate-500">Puede que el enlace sea antiguo o que el elemento ya no exista.</p>
      <ButtonLink href="/panel" className="mt-6">
        Ir al panel
      </ButtonLink>
    </div>
  );
}

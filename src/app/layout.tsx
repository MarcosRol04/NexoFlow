import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NexoFlow — Finanzas personales claras", template: "%s · NexoFlow" },
  description:
    "Registra tus cuentas y movimientos, controla tu gasto y entiende de dónde sale cada cifra. Funciona en tu ordenador con PostgreSQL.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

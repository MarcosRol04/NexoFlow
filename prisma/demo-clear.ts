// Elimina el usuario de demostración y todos sus datos.
//   npm run db:demo:clear
import { DEMO_EMAIL, createScriptClient } from "./script-client";

const prisma = createScriptClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, include: { memberships: true } });
  if (!user) {
    console.info("No hay datos de demostración que borrar.");
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.workspace.deleteMany({ where: { id: { in: user.memberships.map((m) => m.workspaceId) }, type: "PERSONAL" } });
    await tx.user.delete({ where: { id: user.id } });
  });
  console.info(`Datos de demostración eliminados (${DEMO_EMAIL}).`);
}

main()
  .catch((error: unknown) => {
    console.error("Error al borrar los datos de demostración:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

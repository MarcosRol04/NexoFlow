# Estado del desarrollo y limitaciones conocidas

NexoFlow se está desarrollando por fases. Este documento dice con claridad qué
está hecho, qué falta y qué no se ha podido verificar.

## Fases

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Base de datos completa (todas las tablas, migración, CHECK y disparadores), registro, inicio y cierre de sesión, cuentas, categorías, ingresos, gastos y transferencias con filtros y paginación, panel con indicadores, gráficos y avisos, motor de cálculos con pruebas, seed de demostración, verificación de la base de datos | **Hecha** |
| 2 | Presupuestos mensuales (avisos, previsión a fin de mes, copiar del mes anterior) y objetivos de ahorro (aportaciones, retiradas, ritmo necesario, fecha estimada), con su resumen en el panel | **Hecha** |
| 3 | Calendario de pagos y cobros previstos (registrar como movimiento real, vencidos sin registrar), «Dinero disponible» con horizonte hasta el próximo ingreso, previsión de saldo, simulador de escenarios; ajustes de reserva mínima, umbral de avisos y zona horaria | **Hecha** |
| 4 | Análisis comparativo, importación/exportación CSV, resto de ajustes (perfil, moneda, exportar datos, eliminar cuenta), recuperación y cambio de contraseña | Pendiente |
| 5 | Pruebas de integración y end-to-end, resto de documentación | Pendiente |

Las tablas de las fases 2–4 ya existen en la base de datos (migración inicial),
así que las siguientes fases no necesitan rehacer datos.

## Qué se ha verificado y cómo (fases 1 a 3)

- **Migración SQL**: aplicada sobre PostgreSQL 16 real, junto con
  `prisma/sql/create-database.sql` (también una segunda vez, para comprobar que
  es repetible).
- **Restricciones y disparadores**: `tests/sql/integrity-checks.sql` comprueba
  16 casos (cuentas o categorías de otro espacio, importes negativos,
  transferencias descuadradas o con una sola pata, borrados en cascada, etc.).
  Todos se comportan como se espera.
- **Motor financiero** (`src/lib/finance`): 58 pruebas unitarias superadas
  (saldos, transferencias, límites de mes, tasa de ahorro, periodos sin
  ingresos, presupuestos, objetivos, repeticiones del calendario, dinero
  disponible, saldos negativos y simulaciones) y comprobación de tipos con
  TypeScript estricto.
- **Datos de demostración**: el seed se ejecutó con un cliente simulado que
  traduce sus operaciones a SQL; ese SQL se aplicó sobre PostgreSQL 16 real sin
  violar ninguna restricción, y los saldos calculados por PostgreSQL coinciden
  al céntimo con los esperados.
- **Consistencia del código**: todo `src/`, `prisma/` y `scripts/` se comprobó
  con TypeScript estricto usando los tipos reales de Zod 4 y Node.js, y
  declaraciones mínimas en lugar de Next.js, React, Prisma y Recharts (no se
  pudieron instalar). Eso detecta errores entre módulos propios, pero no
  sustituye a `npm run typecheck`.

## Qué NO se ha podido verificar todavía

El entorno donde se generaron estas fases no tenía acceso al registro de npm, así que
**no se pudo ejecutar `npm install`**. En consecuencia, no se han ejecutado:

- `npm run build`, `npm run lint`, `npm run typecheck` sobre todo el proyecto.
- `prisma generate` ni `prisma migrate deploy` con la CLI de Prisma (la
  migración se aplicó con `psql`).
- `npm run db:seed` (el seed y `db:verify` usan el cliente de Prisma).
- Las pruebas unitarias con Vitest: se ejecutaron con un sustituto mínimo de
  la API de Vitest sobre `node:test`.

Por tanto, al ejecutar estos comandos en tu ordenador **pueden aparecer errores
de compilación o de tipos**. Si ocurre, copia la salida completa y se corrige.
Por el mismo motivo, el ZIP de esta fase **no incluye `package-lock.json`**: se
generará en tu primer `npm install`.

## Limitaciones de diseño

- Una sola moneda por espacio (euro por defecto). No hay conversión de divisas.
- Limitación de intentos de inicio de sesión en memoria: se reinicia al
  reiniciar la aplicación (ver `SECURITY.md`).
- La CSP permite `'unsafe-inline'` (ver `SECURITY.md`).
- Los movimientos reales no admiten fechas futuras: los pagos previstos van en
  el calendario.
- «Dinero disponible» solo conoce los pagos y cobros que hayas previsto en el
  calendario; los gastos variables no previstos no se incluyen. Es una
  estimación, no una garantía.
- El simulador supone ingresos y gastos constantes cada mes (sin
  estacionalidad, inflación ni intereses) y empieza el mes siguiente con tu
  saldo actual.
- Los objetivos de ahorro son metas informativas: las aportaciones se registran
  a mano y no mueven dinero entre cuentas.
- Sin conexión con bancos ni gestión de empresas (fuera del alcance del MVP; el
  modelo de datos está preparado para espacios de empresa).

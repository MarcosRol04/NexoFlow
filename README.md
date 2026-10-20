# NexoFlow

Aplicación web de finanzas personales: registra tus cuentas y movimientos,
controla presupuestos y objetivos de ahorro, prevé tus pagos y calcula cuánto
dinero puedes gastar sin quedarte por debajo de la reserva que elijas.

Todo funciona en tu ordenador con **PostgreSQL local**. No usa servicios
externos de inteligencia artificial, bancos ni pagos. Cada cálculo muestra qué
datos ha usado, el periodo y las suposiciones; las estimaciones se distinguen
visualmente de los datos reales.

> NexoFlow es una herramienta de organización personal. No ofrece asesoramiento
> financiero ni recomendaciones de inversión, y no ha sido auditada ni
> certificada.

## Estado del desarrollo

El proyecto se entrega por fases. **Esta versión incluye las fases 1, 2 y 3**:

- ✅ Fase 1: base de datos completa, registro e inicio de sesión, cuentas, categorías, ingresos, gastos y transferencias, panel con avisos explicados.
- ✅ Fase 2: presupuestos mensuales por categoría (con avisos y previsión a fin de mes) y objetivos de ahorro (aportaciones, retiradas, ritmo necesario y fecha estimada).
- ✅ Fase 3: calendario de pagos y cobros previstos (registrar como movimiento real), «Dinero disponible» hasta el próximo ingreso y simulador de escenarios.
- ✅ Ajustes básicos: reserva mínima, umbral de aviso de presupuestos y zona horaria.
- ⏳ Fase 4: análisis comparativo, importación/exportación CSV, exportar datos, eliminar cuenta, cambio y recuperación de contraseña.
- ⏳ Fase 5: pruebas de integración y e2e, resto de la documentación.

La tabla «Qué incluye» describe el producto completo. Detalle de lo verificado y
lo pendiente en [docs/limitaciones-conocidas.md](docs/limitaciones-conocidas.md).

---

## Puesta en marcha rápida (Windows 11)

¿Es tu primera vez? Sigue la guía detallada: **[docs/instalacion-windows-11.md](docs/instalacion-windows-11.md)**.

Resumen, en PowerShell, dentro de la carpeta del proyecto, con Node.js (LTS, 22.12+)
y PostgreSQL (16+) ya instalados:

```powershell
# 1. Crear usuario y bases de datos (te pedirá la contraseña del superusuario "postgres").
#    Cambia 18 por tu versión de PostgreSQL y elige una contraseña para nexoflow_app.
$env:PGCLIENTENCODING = "UTF8"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -v app_password='ESCRIBE_AQUI_LA_CONTRASEÑA' -f prisma\sql\create-database.sql

# 2. Configuración: copia la plantilla y pon esa contraseña en DATABASE_URL y TEST_DATABASE_URL.
Copy-Item .env.example .env
notepad .env

# 3. Dependencias, migraciones, cliente de base de datos y verificación.
npm install
npm run db:setup

# 4. (Opcional) Datos ficticios de demostración. La contraseña se muestra una sola vez.
npm run db:seed

# 5. Arrancar y abrir http://localhost:3000
npm run dev
```

En macOS o Linux los pasos son los mismos cambiando la ruta de `psql`
(`psql -U postgres -h localhost -v app_password='...' -f prisma/sql/create-database.sql`)
y usando `cp .env.example .env`.

---

## Qué incluye (producto completo, al terminar todas las fases)

| Área | Funciones |
| --- | --- |
| **Cuenta de usuario** | Registro, inicio y cierre de sesión, recuperación de contraseña (por SMTP si lo configuras), cambio de contraseña, eliminación de la cuenta con todos sus datos. |
| **Panel** | Saldo total, ingresos, gastos, balance y tasa de ahorro del mes; avisos explicados; evolución de 6 meses; gastos por categoría; próximos compromisos; presupuestos y objetivos. |
| **Cuentas** | Corriente, ahorro, efectivo y otras. Saldo inicial y saldo actual calculado. Archivar sin perder el historial. Transferencias entre cuentas. |
| **Movimientos** | Ingresos, gastos y transferencias. Filtros (fechas, cuenta, categoría, tipo, importe), búsqueda, ordenación y paginación. Aviso de posibles duplicados. |
| **Categorías** | De ingreso y de gasto, con color. Archivar sin romper movimientos antiguos. Categorías iniciales al registrarte. |
| **Presupuestos** | Límite mensual por categoría, avisos al llegar al umbral, proyección a fin de mes, copiar del mes anterior. |
| **Objetivos de ahorro** | Importe, fecha, prioridad, aportaciones y retiradas, ritmo mensual necesario y fecha estimada al ritmo reciente. No suman dinero al saldo. |
| **Calendario** | Ingresos y gastos previstos (únicos, semanales, mensuales, trimestrales, anuales), separados de los reales; registrar una previsión como movimiento real. |
| **Dinero disponible** | Cuánto podrías gastar hasta tu próximo ingreso (u otro horizonte) sin bajar de tu reserva, con la fórmula, los datos y los avisos. |
| **Análisis** | Comparación del mes con el mismo tramo de días del mes anterior, evolución, tasa de ahorro, gasto por categoría. |
| **Simulador** | Escenarios hipotéticos (cambios de ingresos o gastos, compras, ahorro extra, objetivos) sin modificar tus datos; detecta saldos negativos. |
| **Importar y exportar** | CSV con vista previa, mapeo de columnas, validación fila a fila, duplicados, importación «todo o nada», resumen y deshacer. Exportación de movimientos (CSV) y de todos tus datos (JSON). |
| **Ajustes** | Perfil, moneda, zona horaria, reserva mínima, umbral de aviso de presupuestos, privacidad. |

---

## Tecnología

Next.js (App Router) · React · TypeScript estricto · Tailwind CSS · PostgreSQL ·
Prisma ORM · Zod · React Hook Form · Recharts · Vitest · Playwright · ESLint.

Las versiones exactas están en [`package.json`](package.json). Decisiones
importantes:

- **Dinero exacto**: en la base de datos `NUMERIC(14,2)`; en el código, céntimos como `bigint`. Nunca se usa `number` de JavaScript para importes.
- **Integridad en la base de datos**: restricciones `CHECK`, claves foráneas y disparadores que impiden transferencias descuadradas o datos de un usuario mezclados con los de otro, aunque hubiera un error en la aplicación.
- **Motor financiero independiente** (`src/lib/finance`): funciones puras, sin base de datos, con pruebas.
- **Sesiones propias** en PostgreSQL (cookie `HttpOnly`, token aleatorio guardado como hash) y contraseñas con `scrypt`.

Más detalle en [docs/arquitectura.md](docs/arquitectura.md).

---

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca en modo desarrollo en <http://localhost:3000>. |
| `npm run build` | Genera el cliente de base de datos y compila la aplicación. |
| `npm start` | Arranca la versión compilada. |
| `npm run db:setup` | Aplica migraciones, genera el cliente y verifica la base de datos. |
| `npm run db:migrate` | Aplica las migraciones pendientes (`prisma migrate deploy`). |
| `npm run db:generate` | Genera el cliente de Prisma en `src/generated/prisma`. |
| `npm run db:verify` | Comprueba conexión, migraciones, tablas, disparadores e integridad (no modifica nada). |
| `npm run db:status` | Estado de las migraciones. |
| `npm run db:check` | Comprueba que la base de datos coincide con `prisma/schema.prisma`. |
| `npm run db:seed` | Carga datos ficticios de demostración (se niega a ejecutarse en producción). |
| `npm run db:demo:clear` | Elimina los datos de demostración. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Comprobación de tipos con TypeScript. |
| `npm test` | Pruebas unitarias (no necesitan base de datos). |
| `npm run test:integration` | Pruebas contra PostgreSQL real (`TEST_DATABASE_URL`). |
| `npm run test:e2e` | Pruebas de navegador con Playwright (requiere `npm run build`). |
| `npm run check` | Lint + tipos + pruebas unitarias. |

---

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/instalacion-windows-11.md](docs/instalacion-windows-11.md) | Instalación paso a paso y solución de problemas. |
| [docs/arquitectura.md](docs/arquitectura.md) | Estructura del código, capas, flujo de una petición, decisiones. |
| [docs/modelo-de-datos.md](docs/modelo-de-datos.md) | Tablas, relaciones y reglas de integridad. |
| [docs/calculos-financieros.md](docs/calculos-financieros.md) | Fórmulas, redondeos, suposiciones y avisos. |
| [docs/importacion-csv.md](docs/importacion-csv.md) | Formatos admitidos y proceso de importación. |
| [docs/pruebas.md](docs/pruebas.md) | Cómo ejecutar cada tipo de prueba. |
| [docs/despliegue.md](docs/despliegue.md) | Llevar NexoFlow a un servidor con PostgreSQL gestionado. |
| [docs/copias-de-seguridad.md](docs/copias-de-seguridad.md) | Copias de seguridad, restauración y verificación. |
| [docs/limitaciones-conocidas.md](docs/limitaciones-conocidas.md) | Qué no hace todavía y qué no se ha podido verificar. |
| [SECURITY.md](SECURITY.md) | Medidas de seguridad y cómo informar de problemas. |

---

## Privacidad

Tus datos se guardan solo en tu base de datos PostgreSQL. NexoFlow no envía
datos a terceros, no usa analítica ni publicidad, y no tiene conexión con
bancos. Puedes exportar todos tus datos en JSON y eliminar tu cuenta desde
**Ajustes**.

## Licencia

Uso privado. No se concede ninguna licencia de redistribución salvo acuerdo
expreso del propietario del proyecto.

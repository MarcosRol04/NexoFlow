# Instalación paso a paso en Windows 11

Esta guía da por hecho que nunca has instalado un proyecto de Node.js. Todo se
hace con **PowerShell** (busca «PowerShell» en el menú Inicio).

Tiempo aproximado: 20–30 minutos la primera vez.

---

## 1. Instalar Node.js

1. Entra en <https://nodejs.org> y descarga la versión **LTS** (22 o superior).
2. Ejecuta el instalador con las opciones por defecto.
3. Cierra y vuelve a abrir PowerShell, y comprueba:

   ```powershell
   node -v    # debe mostrar v22.12.0 o superior
   npm -v
   ```

## 2. Instalar PostgreSQL

1. Entra en <https://www.postgresql.org/download/windows/> y descarga el
   instalador (versión 16, 17 o 18).
2. Durante la instalación:
   - Deja marcados **PostgreSQL Server** y **Command Line Tools**.
   - Elige una contraseña para el superusuario **postgres** y **guárdala**.
   - Puerto: **5432** (el predeterminado).
3. Al terminar, PostgreSQL queda instalado como servicio y arranca solo.

Comprueba que funciona (cambia `18` por tu versión):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "select version();"
```

Te pedirá la contraseña de `postgres`.

> Si sale «no se reconoce como nombre de un cmdlet», revisa la ruta: abre
> `C:\Program Files\PostgreSQL\` y mira qué número de versión hay.

## 3. Descomprimir el proyecto

Descomprime el ZIP, por ejemplo en `C:\Proyectos\nexoflow`, y entra en la carpeta:

```powershell
cd C:\Proyectos\nexoflow
```

## 4. Crear el usuario y las bases de datos

Elige una contraseña para el usuario de la aplicación (`nexoflow_app`). Usa
solo letras y números para no tener que codificarla en la URL; por ejemplo
una frase larga sin espacios.

```powershell
$env:PGCLIENTENCODING = "UTF8"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -v app_password='ESCRIBE_AQUI_LA_CONTRASEÑA' -f prisma\sql\create-database.sql
```

Debe terminar con: `Listo: usuario nexoflow_app y bases de datos nexoflow y nexoflow_test creados.`

Esto crea:

- El usuario `nexoflow_app` (no es superusuario).
- La base de datos `nexoflow` (la que usas normalmente).
- La base de datos `nexoflow_test` (solo para pruebas).

## 5. Configurar la conexión

```powershell
Copy-Item .env.example .env
notepad .env
```

En las líneas `DATABASE_URL` y `TEST_DATABASE_URL`, sustituye
`CAMBIA_ESTA_CONTRASEÑA` por la contraseña del paso 4. Guarda y cierra.

## 6. Instalar dependencias y preparar la base de datos

```powershell
npm install
npm run db:setup
```

`db:setup` aplica las migraciones, genera el cliente de base de datos y
verifica que todo está bien. Debes ver una lista de comprobaciones con ✔ y
«Todo correcto».

## 7. (Opcional) Cargar datos de demostración

```powershell
npm run db:seed
```

Crea el usuario `demo@nexoflow.local` con 6 meses de datos ficticios. La
contraseña se muestra **una sola vez** en pantalla. Para borrarlos:
`npm run db:demo:clear`.

## 8. Arrancar

```powershell
npm run dev
```

Abre <http://localhost:3000>. Para pararlo, pulsa `Ctrl + C` en PowerShell.

---

## Solución de problemas

| Mensaje | Causa probable y solución |
| --- | --- |
| `P1000: Authentication failed` | La contraseña de `.env` no coincide con la de `nexoflow_app`. Repite el paso 4 (actualiza la contraseña) y revisa `.env`. |
| `P1001: Can't reach database server` | PostgreSQL no está en marcha. Abre «Servicios» de Windows y arranca `postgresql-x64-18`. |
| `Falta la variable DATABASE_URL` / `PrismaConfigEnvError` | No existe `.env` o está mal escrito. Repite el paso 5. |
| `permission denied for schema public` | La base de datos no es propiedad de `nexoflow_app`. Repite el paso 4. |
| `Cannot find module '@/generated/prisma/client'` | Falta generar el cliente: `npm run db:generate`. |
| El puerto 3000 está ocupado | `npm run dev -- -p 3001` y abre <http://localhost:3001>. |
| Caracteres raros (Ã±) en psql | Ejecuta antes `$env:PGCLIENTENCODING = "UTF8"`. |

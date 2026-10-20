# Seguridad en NexoFlow

Este documento describe las medidas de seguridad que **están implementadas** en
el código, las que dependen de cómo instales la aplicación y los riesgos
conocidos. NexoFlow **no ha sido auditado ni certificado** por terceros.

## Cómo informar de un problema

Si encuentras una vulnerabilidad, no la publiques en un sitio abierto. Escribe
al responsable del proyecto con una descripción, los pasos para reproducirla y
su posible impacto. No incluyas datos financieros reales en el informe.

---

## 1. Secretos y configuración

- **Ninguna credencial está en el código ni en el repositorio.** La conexión a la
  base de datos y el SMTP se leen de variables de entorno (`.env`).
- `.env` y sus variantes están en `.gitignore`; solo se versiona `.env.example`,
  que contiene marcadores (`CAMBIA_ESTA_CONTRASEÑA`), no contraseñas reales.
- La contraseña del usuario de base de datos se pasa al script de creación como
  parámetro de `psql` y no se escribe en ningún fichero del proyecto.
- La aplicación usa un usuario de PostgreSQL dedicado (`nexoflow_app`), que no es
  superusuario. El permiso `CREATEDB` solo hace falta para crear migraciones
  nuevas en desarrollo; en producción puedes retirarlo:
  `ALTER ROLE nexoflow_app NOCREATEDB;`

## 2. Contraseñas

- Hash con **scrypt** (incluido en Node.js) con N = 2¹⁷, r = 8, p = 1 y sal
  aleatoria de 16 bytes por contraseña. El formato guarda los parámetros
  (`scrypt$17$8$1$sal$hash`) para poder endurecerlos y rehacer el hash al iniciar
  sesión.
- Comparación en tiempo constante (`timingSafeEqual`).
- Longitud mínima de 10 caracteres (máximo 200).
- Si el correo no existe, se calcula igualmente un hash ficticio para que el
  tiempo de respuesta no revele qué correos están registrados.
- Los mensajes de error de inicio de sesión no distinguen entre «correo no
  registrado» y «contraseña incorrecta».

## 3. Sesiones

- Al iniciar sesión se genera un token aleatorio de 256 bits. **La base de datos
  solo guarda su hash SHA-256**: una copia filtrada de la tabla `sessions` no
  permite suplantar a nadie.
- Cookie `nf_session` con `HttpOnly`, `SameSite=Lax`, `Path=/` y `Secure` en
  producción (`COOKIE_SECURE` permite forzarlo).
- Duración de 30 días, renovada al usarse cuando quedan menos de 15. Las
  sesiones caducadas se eliminan al detectarse y de forma periódica al iniciar sesión.
- Cerrar sesión borra la sesión en el servidor (no solo la cookie).
- Cambiar la contraseña cierra las demás sesiones; restablecerla cierra todas.

## 4. Recuperación de contraseña

- Enlace con token aleatorio de un solo uso, válido 1 hora; se guarda solo su hash.
- Pedir un enlace nuevo invalida los anteriores no usados.
- La respuesta es la misma exista o no el correo.
- **Sin SMTP configurado no se envía nada** y NexoFlow no lo simula. Solo en
  modo desarrollo el enlace se escribe en la consola del servidor, indicando
  que el correo no se ha enviado.

## 5. Limitación de intentos

Límites por ventana de tiempo, en memoria del proceso:

| Acción | Límite |
| --- | --- |
| Inicio de sesión por correo | 8 / 15 min |
| Inicio de sesión por IP | 30 / 15 min |
| Registro por IP | 10 / hora |
| Recuperación por correo | 3 / hora |
| Recuperación por IP | 10 / hora |
| Cambio de contraseña / eliminación de cuenta por usuario | 10 / 15 min |

La IP se obtiene de `X-Forwarded-For` tomando la entrada que añadió el proxy de
confianza (`TRUSTED_PROXY_HOPS`, por defecto 1), no la primera, que puede
inventar el cliente. Con `TRUSTED_PROXY_HOPS=0` se ignoran esas cabeceras.

**Limitación:** el contador vive en memoria. Se reinicia al reiniciar la
aplicación y no se comparte entre varias instancias. Para varias instancias,
sustitúyelo por un almacén compartido (ver `src/lib/auth/rate-limit.ts`).

## 6. Autorización y aislamiento de datos

- Todas las páginas privadas, acciones y rutas de exportación obtienen el
  usuario **en el servidor** a partir de la cookie; nunca confían en
  identificadores enviados por el navegador para decidir a quién pertenecen los datos.
- Cada dato financiero pertenece a un **espacio** (`workspace`). Cada consulta
  filtra por el espacio del usuario, y cualquier identificador recibido (cuenta,
  categoría, movimiento…) se busca dentro de ese espacio; si no está, se responde
  «no encontrado».
- Permisos por rol (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) centralizados en
  `src/lib/permissions`. En esta versión cada usuario tiene un único espacio
  personal con rol `OWNER`; la estructura está preparada para espacios compartidos.
- **Defensa en profundidad en PostgreSQL**: disparadores que rechazan cualquier
  movimiento, transferencia, presupuesto u objetivo que apunte a una cuenta o
  categoría de otro espacio, aunque la aplicación tuviera un fallo.

## 7. Validación de entradas

- Todas las entradas se validan en el servidor con **Zod** (los formularios
  validan también en el navegador, solo por comodidad).
- Importes como texto decimal con reglas explícitas; nunca como `number`.
- Restricciones `CHECK` en la base de datos (importes positivos, fechas
  coherentes, monedas ISO, colores válidos…).
- Fechas futuras rechazadas en movimientos reales.

## 8. Inyección y XSS

- Acceso a datos con Prisma (consultas parametrizadas). Las pocas consultas SQL
  manuales usan plantillas etiquetadas (`$queryRaw\`…\``), que también
  parametrizan. No se usa `$queryRawUnsafe` ni `$executeRawUnsafe`.
- React escapa todo el texto. No se usa `dangerouslySetInnerHTML`.
- **Exportación CSV**: las celdas que empiezan por `=`, `+`, `-`, `@`, tabulador
  o retorno de carro se neutralizan con un apóstrofo para evitar inyección de
  fórmulas al abrir el fichero en Excel.
- **Importación CSV**: máximo 512 KB, 5000 filas, 50 columnas y 1000 caracteres
  por celda; el fichero se procesa como texto y nunca se ejecuta.

## 9. Cabeceras HTTP

Definidas en `next.config.ts` para todas las respuestas:

- `Content-Security-Policy` con `default-src 'self'`, `frame-ancestors 'none'`,
  `form-action 'self'`, `object-src 'none'`, `base-uri 'self'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  restrictiva. Se omite `X-Powered-By`.

**Limitación:** la CSP permite `'unsafe-inline'` en scripts y estilos porque
Next.js inserta scripts en línea para la hidratación. Para endurecerla hay que
usar *nonces* por petición (middleware/proxy de Next.js), lo que obliga a que
todas las páginas sean dinámicas. HSTS no se envía desde la aplicación:
configúralo en el proxy HTTPS (ver `docs/despliegue.md`).

## 10. CSRF

- Las mutaciones se hacen con **Server Actions** de Next.js, que comprueban que el
  origen de la petición coincide con el del sitio.
- La cookie de sesión es `SameSite=Lax`: no se envía en peticiones POST desde otros sitios.
- Las rutas `GET` (exportaciones, estado) no modifican datos.

## 11. Datos personales

- No hay analítica, publicidad ni llamadas a servicios externos (salvo el SMTP
  que configures).
- Exportación completa en JSON y eliminación de la cuenta (con confirmación por
  contraseña) desde **Ajustes**. Al eliminarla se borran en cascada el espacio
  personal y todos sus datos.
- Los registros de errores no incluyen importes, contraseñas ni tokens.

## 12. Datos de demostración

- El seed **nunca** usa contraseñas conocidas: o la defines tú en
  `DEMO_USER_PASSWORD` o se genera una aleatoria que se muestra una vez.
- Se niega a ejecutarse con `NODE_ENV=production` salvo que se fuerce con
  `ALLOW_DEMO_SEED=true`. No lo hagas en una instalación pública.

## 13. Recomendaciones para tu instalación

1. Usa contraseñas largas y distintas para `postgres` y `nexoflow_app`.
2. No expongas el puerto de PostgreSQL (5432) a Internet; en una instalación
   local, PostgreSQL solo debe escuchar en `localhost`.
3. Si publicas NexoFlow fuera de tu ordenador, hazlo **solo con HTTPS** y detrás
   de un proxy inverso (ver `docs/despliegue.md`).
4. Haz copias de seguridad cifradas y comprueba que se pueden restaurar
   (ver `docs/copias-de-seguridad.md`).
5. Mantén Node.js, PostgreSQL y las dependencias actualizados (`npm audit`).

-- NexoFlow — creación del usuario y las bases de datos locales.
--
-- Ejecútalo UNA vez como superusuario (postgres) con psql, pasando la
-- contraseña que elijas para el usuario de la aplicación:
--
--   psql -U postgres -h localhost -v app_password='TU_CONTRASEÑA' -f prisma/sql/create-database.sql
--
-- La contraseña no se guarda en ningún fichero del proyecto.
-- Crea:
--   - el usuario nexoflow_app (no superusuario; CREATEDB solo para `prisma migrate dev`)
--   - la base de datos nexoflow       (uso normal)
--   - la base de datos nexoflow_test  (pruebas de integración y e2e)

\set ON_ERROR_STOP on

\if :{?app_password}
\else
  \echo 'Falta la contraseña. Usa: -v app_password=''tu_contraseña'''
  \quit
\endif

SELECT 'CREATE ROLE nexoflow_app LOGIN NOSUPERUSER NOCREATEROLE CREATEDB'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexoflow_app') \gexec

ALTER ROLE nexoflow_app WITH LOGIN PASSWORD :'app_password';

SELECT 'CREATE DATABASE nexoflow OWNER nexoflow_app ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'nexoflow') \gexec

SELECT 'CREATE DATABASE nexoflow_test OWNER nexoflow_app ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'nexoflow_test') \gexec

REVOKE ALL ON DATABASE nexoflow FROM PUBLIC;
REVOKE ALL ON DATABASE nexoflow_test FROM PUBLIC;
GRANT ALL ON DATABASE nexoflow TO nexoflow_app;
GRANT ALL ON DATABASE nexoflow_test TO nexoflow_app;

\echo 'Listo: usuario nexoflow_app y bases de datos nexoflow y nexoflow_test creados.'

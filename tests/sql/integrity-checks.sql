-- Comprobaciones de integridad de la base de datos (CHECK y disparadores).
-- Ejecútalo SOLO contra una base de datos de pruebas recién migrada (nexoflow_test):
--   psql -U nexoflow_app -h localhost -d nexoflow_test -f tests/sql/integrity-checks.sql
-- Cada bloque indica si se espera OK o ERROR. Al final borra los datos que crea.

\set VERBOSITY terse
INSERT INTO workspaces(id,name,updated_at) VALUES ('00000000-0000-0000-0000-0000000000a1','A',now()),('00000000-0000-0000-0000-0000000000b1','B',now());
INSERT INTO accounts(id,workspace_id,name,opened_on,updated_at,initial_balance) VALUES
 ('00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-0000000000a1','A1','2026-01-01',now(),100.00),
 ('00000000-0000-0000-0000-00000000a002','00000000-0000-0000-0000-0000000000a1','A2','2026-01-01',now(),0),
 ('00000000-0000-0000-0000-00000000b001','00000000-0000-0000-0000-0000000000b1','B1','2026-01-01',now(),0);
INSERT INTO categories(id,workspace_id,name,kind,updated_at) VALUES
 ('00000000-0000-0000-0000-0000000ca001','00000000-0000-0000-0000-0000000000a1','Comida','EXPENSE',now()),
 ('00000000-0000-0000-0000-0000000ca002','00000000-0000-0000-0000-0000000000a1','Nómina','INCOME',now()),
 ('00000000-0000-0000-0000-0000000cb001','00000000-0000-0000-0000-0000000000b1','Comida','EXPENSE',now());
\echo '1 OK esperado: gasto válido'
INSERT INTO transactions(id,workspace_id,account_id,category_id,type,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-0000000ca001','EXPENSE',12.34,'2026-02-01',now());
\echo '2 ERROR esperado: cuenta de otro espacio'
INSERT INTO transactions(id,workspace_id,account_id,type,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000b001','EXPENSE',1,'2026-02-01',now());
\echo '3 ERROR esperado: categoría de otro espacio'
INSERT INTO transactions(id,workspace_id,account_id,category_id,type,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-0000000cb001','EXPENSE',1,'2026-02-01',now());
\echo '4 ERROR esperado: categoría de ingreso en un gasto'
INSERT INTO transactions(id,workspace_id,account_id,category_id,type,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-0000000ca002','EXPENSE',1,'2026-02-01',now());
\echo '5 ERROR esperado: importe negativo'
INSERT INTO transactions(id,workspace_id,account_id,type,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','EXPENSE',-5,'2026-02-01',now());
\echo '6 OK esperado: transferencia cuadrada'
BEGIN;
INSERT INTO transfers(id,workspace_id,from_account_id,to_account_id,amount,date,updated_at) VALUES ('00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a002',50,'2026-02-02',now());
INSERT INTO transactions(id,workspace_id,account_id,type,transfer_id,transfer_leg,amount,date,updated_at) VALUES
 (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','TRANSFER','00000000-0000-0000-0000-00000000f001','OUT',50,'2026-02-02',now()),
 (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a002','TRANSFER','00000000-0000-0000-0000-00000000f001','IN',50,'2026-02-02',now());
COMMIT;
\echo '7 ERROR esperado: transferencia con una sola pata'
BEGIN;
INSERT INTO transfers(id,workspace_id,from_account_id,to_account_id,amount,date,updated_at) VALUES ('00000000-0000-0000-0000-00000000f002','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a002',10,'2026-02-02',now());
INSERT INTO transactions(id,workspace_id,account_id,type,transfer_id,transfer_leg,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','TRANSFER','00000000-0000-0000-0000-00000000f002','OUT',10,'2026-02-02',now());
COMMIT;
\echo '8 ERROR esperado: patas con importes distintos'
BEGIN;
INSERT INTO transfers(id,workspace_id,from_account_id,to_account_id,amount,date,updated_at) VALUES ('00000000-0000-0000-0000-00000000f003','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a002',10,'2026-02-02',now());
INSERT INTO transactions(id,workspace_id,account_id,type,transfer_id,transfer_leg,amount,date,updated_at) VALUES
 (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','TRANSFER','00000000-0000-0000-0000-00000000f003','OUT',10,'2026-02-02',now()),
 (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a002','TRANSFER','00000000-0000-0000-0000-00000000f003','IN',9.99,'2026-02-02',now());
COMMIT;
\echo '9 ERROR esperado: borrar una sola pata de una transferencia'
DELETE FROM transactions WHERE transfer_id='00000000-0000-0000-0000-00000000f001' AND transfer_leg='IN';
\echo '10 OK esperado: editar transferencia y sus patas en una transacción'
BEGIN;
UPDATE transfers SET amount=75 WHERE id='00000000-0000-0000-0000-00000000f001';
UPDATE transactions SET amount=75 WHERE transfer_id='00000000-0000-0000-0000-00000000f001';
COMMIT;
\echo '11 ERROR esperado: transferencia hacia cuenta de otro espacio'
INSERT INTO transfers(id,workspace_id,from_account_id,to_account_id,amount,date,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b001',10,'2026-02-02',now());
\echo '12 OK esperado: borrar transferencia completa (cascada)'
DELETE FROM transfers WHERE id='00000000-0000-0000-0000-00000000f001';
SELECT count(*) AS patas_restantes FROM transactions WHERE type='TRANSFER';
\echo '13 ERROR esperado: presupuesto sobre categoría de ingreso / día != 1'
INSERT INTO budgets(id,workspace_id,category_id,month,limit_amount,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000ca002','2026-02-01',100,now());
INSERT INTO budgets(id,workspace_id,category_id,month,limit_amount,updated_at) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000ca001','2026-02-15',100,now());
\echo '14 ERROR esperado: borrar cuenta con movimientos (NO ACTION)'
DELETE FROM accounts WHERE id='00000000-0000-0000-0000-00000000a001';
\echo '15 ERROR esperado: moneda de cuenta distinta a la del espacio'
INSERT INTO accounts(id,workspace_id,name,opened_on,updated_at,currency) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-0000000000a1','USD','2026-01-01',now(),'USD');
\echo '16 OK esperado: borrar espacio completo (cascada total)'
DELETE FROM workspaces WHERE id='00000000-0000-0000-0000-0000000000a1';
SELECT (SELECT count(*) FROM accounts) cuentas, (SELECT count(*) FROM transactions) movimientos, (SELECT count(*) FROM categories) categorias;
DELETE FROM workspaces WHERE id IN ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1');

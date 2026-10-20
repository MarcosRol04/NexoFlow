-- NexoFlow — migración inicial.
-- Parte 1: estructura equivalente a prisma/schema.prisma.
-- Parte 2: restricciones CHECK y disparadores de integridad (Prisma no los
--          representa en el esquema, pero `prisma migrate` los conserva).

-- CreateEnum
CREATE TYPE "workspace_type" AS ENUM ('PERSONAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "workspace_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "category_kind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "transfer_leg" AS ENUM ('OUT', 'IN');

-- CreateEnum
CREATE TYPE "goal_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "goal_movement_kind" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "schedule_frequency" AS ENUM ('ONCE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "import_batch_status" AS ENUM ('COMPLETED', 'UNDONE');

-- CreateEnum
CREATE TYPE "import_row_status" AS ENUM ('ACCEPTED', 'REJECTED', 'SKIPPED_DUPLICATE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" UUID NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
    "minimum_reserve" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "budget_alert_threshold" SMALLINT NOT NULL DEFAULT 80,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "workspace_type" NOT NULL DEFAULT 'PERSONAL',
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "workspace_role" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "account_type" NOT NULL DEFAULT 'CHECKING',
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "initial_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "opened_on" DATE NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "kind" "category_kind" NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "from_account_id" UUID NOT NULL,
    "to_account_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(200) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID,
    "type" "transaction_type" NOT NULL,
    "transfer_id" UUID,
    "transfer_leg" "transfer_leg",
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(200) NOT NULL DEFAULT '',
    "import_batch_id" UUID,
    "scheduled_item_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "limit_amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "target_amount" DECIMAL(14,2) NOT NULL,
    "initial_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "target_date" DATE,
    "priority" "goal_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "goal_status" NOT NULL DEFAULT 'ACTIVE',
    "linked_account_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_movements" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "kind" "goal_movement_kind" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" VARCHAR(200) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_items" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID,
    "category_id" UUID,
    "type" "category_kind" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "frequency" "schedule_frequency" NOT NULL DEFAULT 'MONTHLY',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "scheduled_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_by_user_id" UUID,
    "file_name" VARCHAR(255) NOT NULL,
    "status" "import_batch_status" NOT NULL DEFAULT 'COMPLETED',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "accepted_rows" INTEGER NOT NULL DEFAULT 0,
    "rejected_rows" INTEGER NOT NULL DEFAULT 0,
    "skipped_rows" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undone_at" TIMESTAMPTZ(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "import_row_status" NOT NULL,
    "raw" JSONB NOT NULL,
    "error" VARCHAR(500),
    "transaction_id" UUID,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "accounts_workspace_id_archived_at_idx" ON "accounts"("workspace_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "categories_workspace_id_kind_name_key" ON "categories"("workspace_id", "kind", "name");

-- CreateIndex
CREATE INDEX "transfers_workspace_id_date_idx" ON "transfers"("workspace_id", "date");

-- CreateIndex
CREATE INDEX "transfers_from_account_id_idx" ON "transfers"("from_account_id");

-- CreateIndex
CREATE INDEX "transfers_to_account_id_idx" ON "transfers"("to_account_id");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_date_idx" ON "transactions"("workspace_id", "date");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_type_date_idx" ON "transactions"("workspace_id", "type", "date");

-- CreateIndex
CREATE INDEX "transactions_account_id_date_idx" ON "transactions"("account_id", "date");

-- CreateIndex
CREATE INDEX "transactions_category_id_date_idx" ON "transactions"("category_id", "date");

-- CreateIndex
CREATE INDEX "transactions_transfer_id_idx" ON "transactions"("transfer_id");

-- CreateIndex
CREATE INDEX "transactions_import_batch_id_idx" ON "transactions"("import_batch_id");

-- CreateIndex
CREATE INDEX "budgets_workspace_id_month_idx" ON "budgets"("workspace_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_workspace_id_category_id_month_key" ON "budgets"("workspace_id", "category_id", "month");

-- CreateIndex
CREATE INDEX "savings_goals_workspace_id_status_idx" ON "savings_goals"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "goal_movements_goal_id_date_idx" ON "goal_movements"("goal_id", "date");

-- CreateIndex
CREATE INDEX "goal_movements_workspace_id_idx" ON "goal_movements"("workspace_id");

-- CreateIndex
CREATE INDEX "scheduled_items_workspace_id_active_start_date_idx" ON "scheduled_items"("workspace_id", "active", "start_date");

-- CreateIndex
CREATE INDEX "import_batches_workspace_id_created_at_idx" ON "import_batches"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_batch_id_row_number_key" ON "import_rows"("batch_id", "row_number");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheduled_item_id_fkey" FOREIGN KEY ("scheduled_item_id") REFERENCES "scheduled_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_linked_account_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_movements" ADD CONSTRAINT "goal_movements_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_movements" ADD CONSTRAINT "goal_movements_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_items" ADD CONSTRAINT "scheduled_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_items" ADD CONSTRAINT "scheduled_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_items" ADD CONSTRAINT "scheduled_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════
-- Parte 2: restricciones CHECK (validación en la propia base de datos)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_chk" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_name_not_blank_chk" CHECK (length(btrim("name")) > 0);

ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_minimum_reserve_chk" CHECK ("minimum_reserve" >= 0),
  ADD CONSTRAINT "user_preferences_threshold_chk" CHECK ("budget_alert_threshold" BETWEEN 1 AND 100);

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "workspaces_name_not_blank_chk" CHECK (length(btrim("name")) > 0);

ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "accounts_name_not_blank_chk" CHECK (length(btrim("name")) > 0);

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_color_chk" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT "categories_name_not_blank_chk" CHECK (length(btrim("name")) > 0);

ALTER TABLE "transfers"
  ADD CONSTRAINT "transfers_amount_positive_chk" CHECK ("amount" > 0),
  ADD CONSTRAINT "transfers_distinct_accounts_chk" CHECK ("from_account_id" <> "to_account_id");

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_positive_chk" CHECK ("amount" > 0),
  -- Un movimiento TRANSFER siempre pertenece a una transferencia, indica su
  -- sentido y no tiene categoría; ingresos y gastos nunca tienen esos datos.
  ADD CONSTRAINT "transactions_transfer_shape_chk" CHECK (
    ("type" = 'TRANSFER' AND "transfer_id" IS NOT NULL AND "transfer_leg" IS NOT NULL AND "category_id" IS NULL)
    OR
    ("type" <> 'TRANSFER' AND "transfer_id" IS NULL AND "transfer_leg" IS NULL)
  );

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_limit_positive_chk" CHECK ("limit_amount" > 0),
  ADD CONSTRAINT "budgets_month_first_day_chk" CHECK (EXTRACT(DAY FROM "month") = 1);

ALTER TABLE "savings_goals"
  ADD CONSTRAINT "savings_goals_target_positive_chk" CHECK ("target_amount" > 0),
  ADD CONSTRAINT "savings_goals_initial_non_negative_chk" CHECK ("initial_amount" >= 0),
  ADD CONSTRAINT "savings_goals_name_not_blank_chk" CHECK (length(btrim("name")) > 0);

ALTER TABLE "goal_movements"
  ADD CONSTRAINT "goal_movements_amount_positive_chk" CHECK ("amount" > 0);

ALTER TABLE "scheduled_items"
  ADD CONSTRAINT "scheduled_items_amount_positive_chk" CHECK ("amount" > 0),
  ADD CONSTRAINT "scheduled_items_dates_chk" CHECK ("end_date" IS NULL OR "end_date" >= "start_date"),
  ADD CONSTRAINT "scheduled_items_description_not_blank_chk" CHECK (length(btrim("description")) > 0);

ALTER TABLE "import_batches"
  ADD CONSTRAINT "import_batches_counts_chk" CHECK (
    "total_rows" >= 0 AND "accepted_rows" >= 0 AND "rejected_rows" >= 0 AND "skipped_rows" >= 0
    AND "accepted_rows" + "rejected_rows" + "skipped_rows" <= "total_rows"
  );

ALTER TABLE "import_rows"
  ADD CONSTRAINT "import_rows_row_number_chk" CHECK ("row_number" >= 1);


-- ═══════════════════════════════════════════════════════════════════════════
-- Parte 3: disparadores de aislamiento entre espacios (defensa en profundidad)
-- Aunque la aplicación tuviera un fallo, la base de datos rechaza cualquier
-- fila que apunte a una cuenta, categoría u objeto de otro espacio.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE FUNCTION "nf_assert_account_in_workspace"(p_account UUID, p_workspace UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_account IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "accounts" WHERE "id" = p_account AND "workspace_id" = p_workspace
  ) THEN
    RAISE EXCEPTION 'nexoflow: la cuenta no pertenece al espacio' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION "nf_assert_category_in_workspace"(p_category UUID, p_workspace UUID, p_kind TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_category IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "categories"
    WHERE "id" = p_category AND "workspace_id" = p_workspace AND "kind"::text = p_kind
  ) THEN
    RAISE EXCEPTION 'nexoflow: la categoría no pertenece al espacio o no es del tipo %', p_kind
      USING ERRCODE = '23514';
  END IF;
END;
$$;

-- Movimientos
CREATE FUNCTION "nf_transactions_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_account_in_workspace"(NEW."account_id", NEW."workspace_id");
  IF NEW."type" <> 'TRANSFER' THEN
    PERFORM "nf_assert_category_in_workspace"(NEW."category_id", NEW."workspace_id", NEW."type"::text);
  END IF;
  IF NEW."transfer_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "transfers" WHERE "id" = NEW."transfer_id" AND "workspace_id" = NEW."workspace_id"
  ) THEN
    RAISE EXCEPTION 'nexoflow: la transferencia no pertenece al espacio' USING ERRCODE = '23514';
  END IF;
  IF NEW."import_batch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "import_batches" WHERE "id" = NEW."import_batch_id" AND "workspace_id" = NEW."workspace_id"
  ) THEN
    RAISE EXCEPTION 'nexoflow: la importación no pertenece al espacio' USING ERRCODE = '23514';
  END IF;
  IF NEW."scheduled_item_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "scheduled_items" WHERE "id" = NEW."scheduled_item_id" AND "workspace_id" = NEW."workspace_id"
  ) THEN
    RAISE EXCEPTION 'nexoflow: la previsión no pertenece al espacio' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "transactions_guard"
  BEFORE INSERT OR UPDATE ON "transactions"
  FOR EACH ROW EXECUTE FUNCTION "nf_transactions_guard"();

-- Transferencias: ambas cuentas del mismo espacio.
CREATE FUNCTION "nf_transfers_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_account_in_workspace"(NEW."from_account_id", NEW."workspace_id");
  PERFORM "nf_assert_account_in_workspace"(NEW."to_account_id", NEW."workspace_id");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "transfers_guard"
  BEFORE INSERT OR UPDATE ON "transfers"
  FOR EACH ROW EXECUTE FUNCTION "nf_transfers_guard"();

-- Transferencias cuadradas: al confirmar la transacción, cada transferencia
-- debe tener exactamente una salida (cuenta origen) y una entrada (cuenta
-- destino), ambas con el importe y la fecha de la transferencia.
CREATE FUNCTION "nf_assert_transfer_balanced"(p_transfer UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t RECORD;
  n_out INTEGER;
  n_in INTEGER;
  n_total INTEGER;
BEGIN
  IF p_transfer IS NULL THEN
    RETURN;
  END IF;
  SELECT * INTO t FROM "transfers" WHERE "id" = p_transfer;
  IF NOT FOUND THEN
    RETURN; -- La transferencia se ha eliminado (sus movimientos se borran en cascada).
  END IF;
  SELECT
    count(*) FILTER (WHERE "transfer_leg" = 'OUT' AND "account_id" = t."from_account_id"
                       AND "amount" = t."amount" AND "date" = t."date" AND "workspace_id" = t."workspace_id"),
    count(*) FILTER (WHERE "transfer_leg" = 'IN' AND "account_id" = t."to_account_id"
                       AND "amount" = t."amount" AND "date" = t."date" AND "workspace_id" = t."workspace_id"),
    count(*)
  INTO n_out, n_in, n_total
  FROM "transactions" WHERE "transfer_id" = p_transfer;

  IF n_out <> 1 OR n_in <> 1 OR n_total <> 2 THEN
    RAISE EXCEPTION 'nexoflow: transferencia descuadrada' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION "nf_transfer_balance_from_transactions"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM "nf_assert_transfer_balanced"(OLD."transfer_id");
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM "nf_assert_transfer_balanced"(NEW."transfer_id");
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION "nf_transfer_balance_from_transfers"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_transfer_balanced"(NEW."id");
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "transactions_transfer_balanced"
  AFTER INSERT OR UPDATE OR DELETE ON "transactions"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "nf_transfer_balance_from_transactions"();

CREATE CONSTRAINT TRIGGER "transfers_balanced"
  AFTER INSERT OR UPDATE ON "transfers"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "nf_transfer_balance_from_transfers"();

-- Cuentas: la moneda debe ser la del espacio (MVP: una moneda por espacio).
CREATE FUNCTION "nf_accounts_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "workspaces" WHERE "id" = NEW."workspace_id" AND "currency" = NEW."currency"
  ) THEN
    RAISE EXCEPTION 'nexoflow: la moneda de la cuenta no coincide con la del espacio' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "accounts_guard"
  BEFORE INSERT OR UPDATE OF "currency", "workspace_id" ON "accounts"
  FOR EACH ROW EXECUTE FUNCTION "nf_accounts_guard"();

-- Presupuestos: solo sobre categorías de gasto del mismo espacio.
CREATE FUNCTION "nf_budgets_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_category_in_workspace"(NEW."category_id", NEW."workspace_id", 'EXPENSE');
  RETURN NEW;
END;
$$;

CREATE TRIGGER "budgets_guard"
  BEFORE INSERT OR UPDATE ON "budgets"
  FOR EACH ROW EXECUTE FUNCTION "nf_budgets_guard"();

-- Objetivos y sus aportaciones.
CREATE FUNCTION "nf_savings_goals_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_account_in_workspace"(NEW."linked_account_id", NEW."workspace_id");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "savings_goals_guard"
  BEFORE INSERT OR UPDATE ON "savings_goals"
  FOR EACH ROW EXECUTE FUNCTION "nf_savings_goals_guard"();

CREATE FUNCTION "nf_goal_movements_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "savings_goals" WHERE "id" = NEW."goal_id" AND "workspace_id" = NEW."workspace_id"
  ) THEN
    RAISE EXCEPTION 'nexoflow: el objetivo no pertenece al espacio' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "goal_movements_guard"
  BEFORE INSERT OR UPDATE ON "goal_movements"
  FOR EACH ROW EXECUTE FUNCTION "nf_goal_movements_guard"();

-- Previsiones del calendario.
CREATE FUNCTION "nf_scheduled_items_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_account_in_workspace"(NEW."account_id", NEW."workspace_id");
  PERFORM "nf_assert_category_in_workspace"(NEW."category_id", NEW."workspace_id", NEW."type"::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER "scheduled_items_guard"
  BEFORE INSERT OR UPDATE ON "scheduled_items"
  FOR EACH ROW EXECUTE FUNCTION "nf_scheduled_items_guard"();

-- Importaciones.
CREATE FUNCTION "nf_import_batches_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "nf_assert_account_in_workspace"(NEW."account_id", NEW."workspace_id");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "import_batches_guard"
  BEFORE INSERT OR UPDATE ON "import_batches"
  FOR EACH ROW EXECUTE FUNCTION "nf_import_batches_guard"();

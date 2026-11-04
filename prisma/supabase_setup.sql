-- ============================================================
-- PharmaPOS — Complete Database Setup Script for Supabase
-- Paste this ENTIRE script in Supabase SQL Editor and Run
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- ── STEP 1: Enums ─────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('admin', 'cashier'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MedicineCategory" AS ENUM ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Supplement', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'UBL', 'JazzCash', 'EasyPaisa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SaleStatus" AS ENUM ('Completed', 'Pending', 'Refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReceiptTemplate" AS ENUM ('thermal', 'a4'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReturnReason" AS ENUM ('Defective', 'Expired', 'WrongItem', 'CustomerRequest', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReturnCondition" AS ENUM ('Good', 'Opened', 'Damaged', 'Expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReturnStatus" AS ENUM ('Approved', 'Rejected', 'Partial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "POStatus" AS ENUM ('Draft', 'Sent', 'Confirmed', 'PartiallyReceived', 'Received', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StockCountStatus" AS ENUM ('Draft', 'InProgress', 'Completed', 'Verified'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationType" AS ENUM ('LowStock', 'ExpiryAlert', 'ReturnProcessed', 'PurchaseOrder', 'System'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TransferType" AS ENUM ('Internal', 'ExternalOut', 'ExternalIn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TransferStatus" AS ENUM ('Pending', 'InTransit', 'Received', 'Returned', 'PaidCash', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ShiftStatus" AS ENUM ('Open', 'Closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── STEP 2: Tables ────────────────────────────────────────────────────────────

-- users
CREATE TABLE IF NOT EXISTS "users" (
    "id"            TEXT        NOT NULL,
    "name"          TEXT        NOT NULL,
    "email"         TEXT        NOT NULL,
    "password_hash" TEXT        NOT NULL,
    "role"          "Role"      NOT NULL DEFAULT 'cashier',
    "is_active"     BOOLEAN     NOT NULL DEFAULT true,
    "permissions"   TEXT[]      NOT NULL DEFAULT '{}',
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- suppliers
CREATE TABLE IF NOT EXISTS "suppliers" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "contact_person" TEXT NOT NULL DEFAULT '',
    "phone"          TEXT NOT NULL,
    "email"          TEXT,
    "address"        TEXT NOT NULL DEFAULT '',
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- medicines
CREATE TABLE IF NOT EXISTS "medicines" (
    "id"                   TEXT              NOT NULL,
    "name"                 TEXT              NOT NULL,
    "generic_name"         TEXT              NOT NULL DEFAULT '',
    "brand"                TEXT              NOT NULL DEFAULT '',
    "category"             "MedicineCategory" NOT NULL DEFAULT 'Other',
    "batch_number"         TEXT              NOT NULL DEFAULT '',
    "expiry_date"          TIMESTAMP(3)      NOT NULL,
    "purchase_price"       DECIMAL(10,2)     NOT NULL DEFAULT 0,
    "selling_price"        DECIMAL(10,2)     NOT NULL DEFAULT 0,
    "stock"                INTEGER           NOT NULL DEFAULT 0,
    "min_stock"            INTEGER           NOT NULL DEFAULT 10,
    "unit"                 TEXT              NOT NULL DEFAULT 'Pcs',
    "description"          TEXT,
    "requires_prescription" BOOLEAN          NOT NULL DEFAULT false,
    "created_at"           TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_id"          TEXT,
    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "medicines_name_idx"        ON "medicines"("name");
CREATE INDEX IF NOT EXISTS "medicines_category_idx"    ON "medicines"("category");
CREATE INDEX IF NOT EXISTS "medicines_expiry_date_idx" ON "medicines"("expiry_date");
CREATE INDEX IF NOT EXISTS "medicines_stock_idx"       ON "medicines"("stock");

-- customers
CREATE TABLE IF NOT EXISTS "customers" (
    "id"              TEXT          NOT NULL,
    "name"            TEXT          NOT NULL,
    "phone"           TEXT          NOT NULL,
    "email"           TEXT,
    "address"         TEXT,
    "total_purchases" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");

-- sales
CREATE TABLE IF NOT EXISTS "sales" (
    "id"             TEXT           NOT NULL,
    "invoice_number" TEXT           NOT NULL,
    "customer_name"  TEXT           NOT NULL DEFAULT 'Walk-in Customer',
    "subtotal"       DECIMAL(12,2)  NOT NULL,
    "discount"       DECIMAL(12,2)  NOT NULL DEFAULT 0,
    "tax"            DECIMAL(12,2)  NOT NULL DEFAULT 0,
    "total"          DECIMAL(12,2)  NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'Cash',
    "status"         "SaleStatus"   NOT NULL DEFAULT 'Completed',
    "cashier_name"   TEXT           NOT NULL DEFAULT '',
    "created_at"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id"    TEXT,
    "cashier_id"     TEXT           NOT NULL,
    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sales_invoice_number_key" ON "sales"("invoice_number");
CREATE INDEX IF NOT EXISTS "sales_created_at_idx"      ON "sales"("created_at");
CREATE INDEX IF NOT EXISTS "sales_customer_id_idx"     ON "sales"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_invoice_number_idx"  ON "sales"("invoice_number");

-- sale_items
CREATE TABLE IF NOT EXISTS "sale_items" (
    "id"           TEXT          NOT NULL,
    "medicine_name" TEXT         NOT NULL,
    "quantity"     INTEGER       NOT NULL,
    "unit_price"   DECIMAL(10,2) NOT NULL,
    "discount"     DECIMAL(5,2)  NOT NULL DEFAULT 0,
    "total"        DECIMAL(12,2) NOT NULL,
    "sale_id"      TEXT          NOT NULL,
    "medicine_id"  TEXT          NOT NULL,
    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- sale_returns
CREATE TABLE IF NOT EXISTS "sale_returns" (
    "id"             TEXT           NOT NULL,
    "return_number"  TEXT           NOT NULL,
    "invoice_number" TEXT           NOT NULL,
    "return_date"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason"         TEXT           NOT NULL DEFAULT 'CustomerRequest',
    "notes"          TEXT,
    "refund_amount"  DECIMAL(12,2)  NOT NULL,
    "refund_method"  TEXT           NOT NULL DEFAULT 'Cash',
    "status"         "ReturnStatus" NOT NULL DEFAULT 'Approved',
    "created_at"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id"        TEXT           NOT NULL,
    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sale_returns_return_number_key" ON "sale_returns"("return_number");
CREATE INDEX IF NOT EXISTS "sale_returns_sale_id_idx"     ON "sale_returns"("sale_id");
CREATE INDEX IF NOT EXISTS "sale_returns_return_date_idx" ON "sale_returns"("return_date");

-- sale_return_items
CREATE TABLE IF NOT EXISTS "sale_return_items" (
    "id"              TEXT              NOT NULL,
    "medicine_name"   TEXT              NOT NULL,
    "sale_quantity"   INTEGER           NOT NULL,
    "return_quantity" INTEGER           NOT NULL,
    "unit_price"      DECIMAL(10,2)     NOT NULL,
    "reason"          "ReturnReason"    NOT NULL DEFAULT 'CustomerRequest',
    "condition"       "ReturnCondition" NOT NULL DEFAULT 'Good',
    "return_id"       TEXT              NOT NULL,
    "medicine_id"     TEXT,
    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sale_return_items_return_id_idx" ON "sale_return_items"("return_id");

-- expenses
CREATE TABLE IF NOT EXISTS "expenses" (
    "id"          TEXT          NOT NULL,
    "description" TEXT          NOT NULL,
    "amount"      DECIMAL(12,2) NOT NULL,
    "category"    TEXT          NOT NULL DEFAULT 'Other',
    "date"        DATE          NOT NULL,
    "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses"("date");

-- purchase_orders
CREATE TABLE IF NOT EXISTS "purchase_orders" (
    "id"                     TEXT        NOT NULL,
    "po_number"              TEXT        NOT NULL,
    "supplier_id"            TEXT,
    "supplier_name"          TEXT        NOT NULL DEFAULT '',
    "po_date"                DATE        NOT NULL DEFAULT CURRENT_DATE,
    "expected_delivery_date" DATE,
    "status"                 "POStatus"  NOT NULL DEFAULT 'Draft',
    "total_amount"           DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes"                  TEXT,
    "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_po_number_key"  ON "purchase_orders"("po_number");
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx"   ON "purchase_orders"("status");
CREATE INDEX IF NOT EXISTS "purchase_orders_po_date_idx"  ON "purchase_orders"("po_date");

-- purchase_order_items
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
    "id"                TEXT          NOT NULL,
    "medicine_name"     TEXT          NOT NULL,
    "quantity"          INTEGER       NOT NULL DEFAULT 1,
    "unit_price"        DECIMAL(10,2) NOT NULL,
    "received_quantity" INTEGER       NOT NULL DEFAULT 0,
    "total"             DECIMAL(12,2) NOT NULL,
    "batch_number"      TEXT,
    "expiry_date"       DATE,
    "purchase_order_id" TEXT          NOT NULL,
    "medicine_id"       TEXT,
    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- stock_counts
CREATE TABLE IF NOT EXISTS "stock_counts" (
    "id"           TEXT               NOT NULL,
    "count_number" TEXT               NOT NULL,
    "count_date"   DATE               NOT NULL DEFAULT CURRENT_DATE,
    "status"       "StockCountStatus" NOT NULL DEFAULT 'Draft',
    "notes"        TEXT,
    "created_at"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id"      TEXT,
    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "stock_counts_count_number_key" ON "stock_counts"("count_number");
CREATE INDEX IF NOT EXISTS "stock_counts_count_date_idx" ON "stock_counts"("count_date");

-- stock_count_items
CREATE TABLE IF NOT EXISTS "stock_count_items" (
    "id"             TEXT    NOT NULL,
    "medicine_name"  TEXT    NOT NULL,
    "batch_number"   TEXT    NOT NULL DEFAULT '',
    "system_stock"   INTEGER NOT NULL,
    "physical_count" INTEGER,
    "variance"       INTEGER NOT NULL DEFAULT 0,
    "notes"          TEXT,
    "count_id"       TEXT    NOT NULL,
    "medicine_id"    TEXT    NOT NULL,
    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- stock_transfers
CREATE TABLE IF NOT EXISTS "stock_transfers" (
    "id"               TEXT             NOT NULL,
    "transfer_number"  TEXT             NOT NULL,
    "transfer_type"    "TransferType"   NOT NULL DEFAULT 'Internal',
    "from_branch"      TEXT             NOT NULL,
    "to_branch"        TEXT             NOT NULL,
    "external_pharmacy" TEXT,
    "external_phone"   TEXT,
    "contact_person"   TEXT,
    "settlement_type"  TEXT             DEFAULT 'StockReturn',
    "settled_amount"   DECIMAL(10,2),
    "transfer_date"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receive_date"     TIMESTAMP(3),
    "settled_date"     TIMESTAMP(3),
    "status"           "TransferStatus" NOT NULL DEFAULT 'Pending',
    "notes"            TEXT,
    "initiated_by"     TEXT             NOT NULL DEFAULT 'Admin',
    "created_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "stock_transfers_transfer_number_key" ON "stock_transfers"("transfer_number");
CREATE INDEX IF NOT EXISTS "stock_transfers_transfer_type_idx" ON "stock_transfers"("transfer_type");
CREATE INDEX IF NOT EXISTS "stock_transfers_status_idx"        ON "stock_transfers"("status");
CREATE INDEX IF NOT EXISTS "stock_transfers_transfer_date_idx" ON "stock_transfers"("transfer_date");

-- stock_transfer_items
CREATE TABLE IF NOT EXISTS "stock_transfer_items" (
    "id"           TEXT          NOT NULL,
    "transfer_id"  TEXT          NOT NULL,
    "medicine_id"  TEXT,
    "medicine_name" TEXT         NOT NULL,
    "quantity"     INTEGER       NOT NULL DEFAULT 1,
    "unit_price"   DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total"        DECIMAL(10,2) NOT NULL DEFAULT 0,
    "batch_number" TEXT,
    "expiry_date"  TIMESTAMP(3),
    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_medicine_id_idx" ON "stock_transfer_items"("medicine_id");

-- login_history
CREATE TABLE IF NOT EXISTS "login_history" (
    "id"         TEXT         NOT NULL,
    "action"     TEXT         NOT NULL DEFAULT 'Login',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status"     TEXT         NOT NULL DEFAULT 'success',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id"    TEXT         NOT NULL,
    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "login_history_user_id_idx"  ON "login_history"("user_id");
CREATE INDEX IF NOT EXISTS "login_history_created_at_idx" ON "login_history"("created_at");

-- notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id"         TEXT               NOT NULL,
    "type"       "NotificationType" NOT NULL DEFAULT 'System',
    "title"      TEXT               NOT NULL,
    "message"    TEXT               NOT NULL,
    "is_read"    BOOLEAN            NOT NULL DEFAULT false,
    "data"       JSONB,
    "created_at" TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id"    TEXT,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx"   ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx"   ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- cash_shifts
CREATE TABLE IF NOT EXISTS "cash_shifts" (
    "id"              TEXT          NOT NULL,
    "shift_number"    TEXT          NOT NULL,
    "opened_by"       TEXT          NOT NULL,
    "closed_by"       TEXT,
    "open_time"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "close_time"      TIMESTAMP(3),
    "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(12,2),
    "expected_cash"   DECIMAL(12,2),
    "variance"        DECIMAL(12,2),
    "status"          "ShiftStatus" NOT NULL DEFAULT 'Open',
    "notes"           TEXT,
    "created_at"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cash_shifts_shift_number_key" ON "cash_shifts"("shift_number");
CREATE INDEX IF NOT EXISTS "cash_shifts_status_idx" ON "cash_shifts"("status");

-- cash_shift_entries
CREATE TABLE IF NOT EXISTS "cash_shift_entries" (
    "id"          TEXT          NOT NULL,
    "description" TEXT          NOT NULL,
    "amount"      DECIMAL(12,2) NOT NULL,
    "type"        TEXT          NOT NULL DEFAULT 'in',
    "created_at"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shift_id"    TEXT          NOT NULL,
    CONSTRAINT "cash_shift_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cash_shift_entries_shift_id_idx" ON "cash_shift_entries"("shift_id");

-- permissions
CREATE TABLE IF NOT EXISTS "permissions" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT         NOT NULL,
    "module"      TEXT         NOT NULL,
    "action"      TEXT         NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_name_key"   ON "permissions"("name");
CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");

-- role_permissions
CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id"            TEXT         NOT NULL,
    "role"          "Role"       NOT NULL,
    "permission_id" TEXT         NOT NULL,
    "is_granted"    BOOLEAN      NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_id_key" ON "role_permissions"("role", "permission_id");

-- user_permissions
CREATE TABLE IF NOT EXISTS "user_permissions" (
    "id"            TEXT         NOT NULL,
    "user_id"       TEXT         NOT NULL,
    "permission_id" TEXT         NOT NULL,
    "is_granted"    BOOLEAN      NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx"            ON "user_permissions"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_permissions_user_id_permission_id_key" ON "user_permissions"("user_id", "permission_id");

-- app_settings
CREATE TABLE IF NOT EXISTS "app_settings" (
    "id"                  INTEGER         NOT NULL DEFAULT 1,
    "pharmacy_name"       TEXT            NOT NULL DEFAULT 'My Pharmacy',
    "address"             TEXT            NOT NULL DEFAULT '',
    "phone"               TEXT            NOT NULL DEFAULT '',
    "tax_rate"            DECIMAL(5,4)    NOT NULL DEFAULT 0,
    "invoice_prefix"      TEXT            NOT NULL DEFAULT 'INV',
    "currency"            TEXT            NOT NULL DEFAULT 'PKR',
    "low_stock_threshold" INTEGER         NOT NULL DEFAULT 10,
    "receipt_template"    "ReceiptTemplate" NOT NULL DEFAULT 'thermal',
    "allow_line_discount" BOOLEAN         NOT NULL DEFAULT true,
    "allow_bill_discount" BOOLEAN         NOT NULL DEFAULT true,
    "allow_split_payment" BOOLEAN         NOT NULL DEFAULT true,
    "allow_hold_sale"     BOOLEAN         NOT NULL DEFAULT true,
    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- ── STEP 3: Foreign Keys ──────────────────────────────────────────────────────

DO $$ BEGIN ALTER TABLE "medicines"            ADD CONSTRAINT "medicines_supplier_id_fkey"                    FOREIGN KEY ("supplier_id")       REFERENCES "suppliers"("id")        ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales"                ADD CONSTRAINT "sales_customer_id_fkey"                        FOREIGN KEY ("customer_id")       REFERENCES "customers"("id")        ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales"                ADD CONSTRAINT "sales_cashier_id_fkey"                         FOREIGN KEY ("cashier_id")        REFERENCES "users"("id")            ON DELETE RESTRICT  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_items"           ADD CONSTRAINT "sale_items_sale_id_fkey"                       FOREIGN KEY ("sale_id")           REFERENCES "sales"("id")            ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_items"           ADD CONSTRAINT "sale_items_medicine_id_fkey"                   FOREIGN KEY ("medicine_id")       REFERENCES "medicines"("id")        ON DELETE RESTRICT  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_returns"         ADD CONSTRAINT "sale_returns_sale_id_fkey"                     FOREIGN KEY ("sale_id")           REFERENCES "sales"("id")            ON DELETE RESTRICT  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_return_items"    ADD CONSTRAINT "sale_return_items_return_id_fkey"              FOREIGN KEY ("return_id")         REFERENCES "sale_returns"("id")     ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_return_items"    ADD CONSTRAINT "sale_return_items_medicine_id_fkey"            FOREIGN KEY ("medicine_id")       REFERENCES "medicines"("id")        ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_orders"      ADD CONSTRAINT "purchase_orders_supplier_id_fkey"              FOREIGN KEY ("supplier_id")       REFERENCES "suppliers"("id")        ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey"   FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id")  ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_medicine_id_fkey"         FOREIGN KEY ("medicine_id")       REFERENCES "medicines"("id")        ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_counts"         ADD CONSTRAINT "stock_counts_user_id_fkey"                     FOREIGN KEY ("user_id")           REFERENCES "users"("id")            ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_count_items"    ADD CONSTRAINT "stock_count_items_count_id_fkey"               FOREIGN KEY ("count_id")          REFERENCES "stock_counts"("id")     ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_count_items"    ADD CONSTRAINT "stock_count_items_medicine_id_fkey"            FOREIGN KEY ("medicine_id")       REFERENCES "medicines"("id")        ON DELETE RESTRICT  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey"         FOREIGN KEY ("transfer_id")       REFERENCES "stock_transfers"("id")  ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_medicine_id_fkey"         FOREIGN KEY ("medicine_id")       REFERENCES "medicines"("id")        ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "login_history"        ADD CONSTRAINT "login_history_user_id_fkey"                    FOREIGN KEY ("user_id")           REFERENCES "users"("id")            ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notifications"        ADD CONSTRAINT "notifications_user_id_fkey"                    FOREIGN KEY ("user_id")           REFERENCES "users"("id")            ON DELETE SET NULL  ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "cash_shift_entries"   ADD CONSTRAINT "cash_shift_entries_shift_id_fkey"              FOREIGN KEY ("shift_id")          REFERENCES "cash_shifts"("id")      ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "role_permissions"     ADD CONSTRAINT "role_permissions_permission_id_fkey"           FOREIGN KEY ("permission_id")     REFERENCES "permissions"("id")      ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "user_permissions"     ADD CONSTRAINT "user_permissions_user_id_fkey"                 FOREIGN KEY ("user_id")           REFERENCES "users"("id")            ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "user_permissions"     ADD CONSTRAINT "user_permissions_permission_id_fkey"           FOREIGN KEY ("permission_id")     REFERENCES "permissions"("id")      ON DELETE CASCADE   ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── STEP 4: Default Data ──────────────────────────────────────────────────────

-- App Settings (only if empty)
INSERT INTO "app_settings" ("id", "pharmacy_name", "address", "phone", "tax_rate", "invoice_prefix", "currency")
VALUES (1, 'Al-Shifa Pharmacy', 'Shop 12, Main Market, Gulshan-e-Iqbal, Karachi', '021-34567890', 0, 'INV', 'PKR')
ON CONFLICT ("id") DO NOTHING;

-- Admin user (password: admin123)
-- bcrypt hash of "admin123" with 12 rounds
INSERT INTO "users" ("id", "name", "email", "password_hash", "role", "is_active", "permissions")
VALUES (
    gen_random_uuid(),
    'Dr. Ahmed Ali',
    'admin@pharmapos.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oR6VvVvKi',
    'admin',
    true,
    '{}'
)
ON CONFLICT ("email") DO NOTHING;

-- Cashier user (password: cashier123)
INSERT INTO "users" ("id", "name", "email", "password_hash", "role", "is_active", "permissions")
VALUES (
    gen_random_uuid(),
    'Fatima Malik',
    'cashier@pharmapos.com',
    '$2a$12$oeUyYRMlkk.X4dA1EfArd.PvSKi7pAYMcAqJBSRqPp/3mAqYivYOq',
    'cashier',
    true,
    '{}'
)
ON CONFLICT ("email") DO NOTHING;

-- Permissions (only insert if table is empty)
INSERT INTO "permissions" ("id", "name", "description", "module", "action")
SELECT gen_random_uuid(), v.name, v.description, v.module, v.action
FROM (VALUES
    ('view_dashboard',        'View dashboard and analytics',  'dashboard',       'view'),
    ('view_medicines',        'View medicines list',           'medicines',       'view'),
    ('create_medicine',       'Add new medicine',              'medicines',       'create'),
    ('edit_medicine',         'Edit medicine details',         'medicines',       'edit'),
    ('delete_medicine',       'Delete medicine',               'medicines',       'delete'),
    ('view_sales',            'View sales history',            'sales',           'view'),
    ('create_sale',           'Create new sale',               'sales',           'create'),
    ('void_sale',             'Void/cancel sale',              'sales',           'delete'),
    ('view_customers',        'View customers list',           'customers',       'view'),
    ('create_customer',       'Add new customer',              'customers',       'create'),
    ('edit_customer',         'Edit customer details',         'customers',       'edit'),
    ('delete_customer',       'Delete customer',               'customers',       'delete'),
    ('view_suppliers',        'View suppliers list',           'suppliers',       'view'),
    ('create_supplier',       'Add new supplier',              'suppliers',       'create'),
    ('edit_supplier',         'Edit supplier details',         'suppliers',       'edit'),
    ('delete_supplier',       'Delete supplier',               'suppliers',       'delete'),
    ('view_purchase_orders',  'View purchase orders',          'purchase_orders', 'view'),
    ('create_purchase_order', 'Create purchase order',         'purchase_orders', 'create'),
    ('edit_purchase_order',   'Edit purchase order',           'purchase_orders', 'edit'),
    ('delete_purchase_order', 'Delete purchase order',         'purchase_orders', 'delete'),
    ('view_returns',          'View returns',                  'returns',         'view'),
    ('create_return',         'Process return',                'returns',         'create'),
    ('view_stock_count',      'View stock counts',             'stock_count',     'view'),
    ('create_stock_count',    'Create stock count',            'stock_count',     'create'),
    ('edit_stock_count',      'Edit stock count',              'stock_count',     'edit'),
    ('view_transfers',        'View stock transfers',          'transfers',       'view'),
    ('create_transfer',       'Create stock transfer',         'transfers',       'create'),
    ('edit_transfer',         'Edit stock transfer',           'transfers',       'edit'),
    ('delete_transfer',       'Delete stock transfer',         'transfers',       'delete'),
    ('view_expenses',         'View expenses',                 'expenses',        'view'),
    ('create_expense',        'Add expense',                   'expenses',        'create'),
    ('edit_expense',          'Edit expense',                  'expenses',        'edit'),
    ('delete_expense',        'Delete expense',                'expenses',        'delete'),
    ('view_reports',          'View reports',                  'reports',         'view'),
    ('export_reports',        'Export reports',                'reports',         'export'),
    ('view_settings',         'View settings',                 'settings',        'view'),
    ('edit_settings',         'Edit settings',                 'settings',        'edit'),
    ('view_users',            'View users list',               'users',           'view'),
    ('create_user',           'Create new user',               'users',           'create'),
    ('edit_user',             'Edit user details',             'users',           'edit'),
    ('delete_user',           'Delete user',                   'users',           'delete'),
    ('manage_permissions',    'Manage role permissions',       'permissions',     'manage')
) AS v(name, description, module, action)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "permissions"."name" = v.name);

-- Grant all permissions to admin role
INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_granted")
SELECT gen_random_uuid(), 'admin', "id", true FROM "permissions"
WHERE NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp.role = 'admin' AND rp.permission_id = permissions.id
);

-- Grant basic permissions to cashier
INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_granted")
SELECT gen_random_uuid(), 'cashier', "id", true FROM "permissions"
WHERE "name" IN ('view_dashboard','view_medicines','view_sales','create_sale','view_customers','create_customer')
AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp WHERE rp.role = 'cashier' AND rp.permission_id = permissions.id
);

-- ── STEP 5: Mark all migrations as applied in Prisma shadow table ─────────────

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT         NOT NULL,
    "checksum"              TEXT         NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        TEXT         NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES
    (gen_random_uuid(), 'manual', now(), '20261028183705_init', 1),
    (gen_random_uuid(), 'manual', now(), '20261028191937_add_stock_transfers', 1),
    (gen_random_uuid(), 'manual', now(), '20261028192617_add_transfer_type_external', 1),
    (gen_random_uuid(), 'manual', now(), '20261028194023_add_sale_returns', 1),
    (gen_random_uuid(), 'manual', now(), '20261028204416_add_cash_shifts', 1),
    (gen_random_uuid(), 'manual', now(), '20261029171302_add_user_permissions', 1),
    (gen_random_uuid(), 'manual', now(), '20261030073741_init_full_schema', 1),
    (gen_random_uuid(), 'manual', now(), '20261031120000_add_stock_transfers', 1),
    (gen_random_uuid(), 'manual', now(), '20261101000000_add_permissions_system', 1),
    (gen_random_uuid(), 'manual', now(), '20261104000000_add_missing_tables', 1)
ON CONFLICT DO NOTHING;

-- ── Done! ─────────────────────────────────────────────────────────────────────
-- Tables created: users, medicines, customers, suppliers, sales, sale_items,
-- sale_returns, sale_return_items, expenses, purchase_orders, purchase_order_items,
-- stock_counts, stock_count_items, stock_transfers, stock_transfer_items,
-- login_history, notifications, cash_shifts, cash_shift_entries,
-- permissions, role_permissions, user_permissions, app_settings
--
-- Default users:
--   Admin   → admin@pharmapos.com   / admin123
--   Cashier → cashier@pharmapos.com / cashier123

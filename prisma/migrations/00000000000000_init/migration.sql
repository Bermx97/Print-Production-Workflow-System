-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "step_scope" AS ENUM ('per_part', 'per_order', 'aggregated');

-- CreateEnum
CREATE TYPE "employee_role" AS ENUM ('printer_operator', 'folding_operator', 'sewing_operator', 'case_maker', 'hardcover_binder_operator', 'perfect_bound_operator', 'stitching_operator', 'seller', 'technologist', 'admin');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('hardcover_book', 'perfect_bound_book', 'saddle_stitching');

-- CreateEnum
CREATE TYPE "step_event_type" AS ENUM ('START', 'END', 'PAUSE', 'RESUME');

-- CreateEnum
CREATE TYPE "step_name" AS ENUM ('printing', 'folding', 'sewing', 'case_making', 'folding_with_milling', 'hardcover_binding', 'binding', 'stitching');

-- CreateEnum
CREATE TYPE "Variant" AS ENUM ('V4', 'V8', 'V16', 'V24', 'V32', 'V64', 'COVER');

-- CreateEnum
CREATE TYPE "execution_status" AS ENUM ('active', 'paused', 'done', 'cancelled');

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "order_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "product_type" "product_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customer" TEXT NOT NULL,
    "number_of_pages" INTEGER NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" TEXT NOT NULL,
    "login" VARCHAR(20) NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "role" "employee_role" NOT NULL,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_logs" (
    "id" TEXT NOT NULL,
    "step_name" "step_name" NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_part_id" TEXT,
    "event_type" "step_event_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employee" TEXT NOT NULL,

    CONSTRAINT "step_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_parts" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "variant" "Variant" NOT NULL,
    "runs" INTEGER,
    "part_quantity" INTEGER NOT NULL,

    CONSTRAINT "order_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_execution" (
    "id" TEXT NOT NULL,
    "order_part_id" TEXT,
    "order_id" TEXT NOT NULL,
    "step_type" "step_name" NOT NULL,
    "step_scope" "step_scope" NOT NULL,
    "done_quantity" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "status" "execution_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_execution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_order_number_key" ON "order"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "employee_login_key" ON "employee"("login");

-- CreateIndex
CREATE INDEX "step_logs_order_id_idx" ON "step_logs"("order_id");

-- CreateIndex
CREATE INDEX "step_logs_step_name_idx" ON "step_logs"("step_name");

-- CreateIndex
CREATE INDEX "step_logs_created_at_idx" ON "step_logs"("created_at");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_employee_fkey" FOREIGN KEY ("employee") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_order_part_id_fkey" FOREIGN KEY ("order_part_id") REFERENCES "order_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_parts" ADD CONSTRAINT "order_parts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_execution" ADD CONSTRAINT "step_execution_order_part_id_fkey" FOREIGN KEY ("order_part_id") REFERENCES "order_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_execution" ADD CONSTRAINT "step_execution_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

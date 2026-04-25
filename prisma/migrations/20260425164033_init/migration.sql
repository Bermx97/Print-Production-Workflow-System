-- CreateEnum
CREATE TYPE "employee_role" AS ENUM ('printer', 'cutter', 'gluer', 'admin', 'technologist');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('printing', 'cutting', 'gluing');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" INTEGER NOT NULL,
    "status" "order_status" NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "assigned_to" TEXT,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "login" VARCHAR(20) NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "role" "employee_role" NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_login_key" ON "employees"("login");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

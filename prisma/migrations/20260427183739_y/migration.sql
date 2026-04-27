/*
  Warnings:

  - You are about to drop the `employees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_created_by_fkey";

-- DropTable
DROP TABLE "employees";

-- DropTable
DROP TABLE "orders";

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "order_number" INTEGER NOT NULL,
    "status" "order_status" NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "assigned_to" TEXT,
    "created_by" TEXT NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "order_order_number_key" ON "order"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "employee_login_key" ON "employee"("login");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

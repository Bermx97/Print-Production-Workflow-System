-- CreateEnum
CREATE TYPE "employee_role" AS ENUM ('printer_operator', 'folding_operator', 'sewing_operator', 'case_maker', 'hardcover_binder_operator', 'perfect_bound_operator', 'stitching_operator', 'seller', 'technologist', 'admin');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('hardcover_book', 'perfect_bound_book', 'saddle_stitching');

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "order_number" INTEGER NOT NULL,
    "completed_steps" TEXT[],
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "product_type" "product_type" NOT NULL,

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
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

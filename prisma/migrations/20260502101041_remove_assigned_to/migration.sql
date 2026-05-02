/*
  Warnings:

  - You are about to drop the column `assigned_to` on the `order` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "employee_role" ADD VALUE 'seller';

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_assigned_to_fkey";

-- AlterTable
ALTER TABLE "order" DROP COLUMN "assigned_to";

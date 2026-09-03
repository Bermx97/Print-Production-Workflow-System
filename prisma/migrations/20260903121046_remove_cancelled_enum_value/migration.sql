/*
  Warnings:

  - The values [cancelled] on the enum `execution_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "execution_status_new" AS ENUM ('active', 'paused', 'done');
ALTER TABLE "step_execution" ALTER COLUMN "status" TYPE "execution_status_new" USING ("status"::text::"execution_status_new");
ALTER TYPE "execution_status" RENAME TO "execution_status_old";
ALTER TYPE "execution_status_new" RENAME TO "execution_status";
DROP TYPE "public"."execution_status_old";
COMMIT;

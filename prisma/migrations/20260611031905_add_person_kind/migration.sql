-- CreateEnum
CREATE TYPE "PersonKind" AS ENUM ('TRAINEE', 'TRAINER', 'STAFF');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "kind" "PersonKind" NOT NULL DEFAULT 'TRAINEE';

-- CreateIndex
CREATE INDEX "Person_kind_idx" ON "Person"("kind");

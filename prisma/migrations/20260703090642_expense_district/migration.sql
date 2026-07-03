-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "districtId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_districtId_idx" ON "Expense"("districtId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

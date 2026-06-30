-- AlterTable
ALTER TABLE "User" ADD COLUMN     "districtId" TEXT;

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "User"("districtId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

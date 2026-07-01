-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "futureProgramId" TEXT;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_futureProgramId_fkey" FOREIGN KEY ("futureProgramId") REFERENCES "FutureProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

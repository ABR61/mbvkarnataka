-- CreateTable
CREATE TABLE "FutureProgram" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "plannedFor" TEXT,
    "durationWeeks" INTEGER,
    "seats" INTEGER,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FutureProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FutureProgram_districtId_idx" ON "FutureProgram"("districtId");

-- AddForeignKey
ALTER TABLE "FutureProgram" ADD CONSTRAINT "FutureProgram_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FutureProgram" ADD CONSTRAINT "FutureProgram_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

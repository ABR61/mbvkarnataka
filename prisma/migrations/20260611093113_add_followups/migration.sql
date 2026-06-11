-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "followUpOn" TIMESTAMP(3) NOT NULL,
    "periodMonths" INTEGER,
    "stillEmployed" BOOLEAN NOT NULL DEFAULT true,
    "monthlyIncome" DECIMAL(10,2),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_placementId_idx" ON "FollowUp"("placementId");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

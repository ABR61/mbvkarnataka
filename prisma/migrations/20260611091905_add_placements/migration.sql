-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PLACED', 'ACTIVE', 'EXITED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'SELF_EMPLOYED', 'APPRENTICESHIP');

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "districtId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "jobTitle" TEXT,
    "employmentType" "EmploymentType",
    "monthlySalary" DECIMAL(10,2),
    "placedOn" TIMESTAMP(3) NOT NULL,
    "status" "PlacementStatus" NOT NULL DEFAULT 'PLACED',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employer_districtId_idx" ON "Employer"("districtId");

-- CreateIndex
CREATE INDEX "Placement_personId_idx" ON "Placement"("personId");

-- CreateIndex
CREATE INDEX "Placement_employerId_idx" ON "Placement"("employerId");

-- CreateIndex
CREATE INDEX "Placement_status_idx" ON "Placement"("status");

-- AddForeignKey
ALTER TABLE "Employer" ADD CONSTRAINT "Employer_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

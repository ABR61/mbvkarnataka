-- CreateEnum
CREATE TYPE "AttendanceChangeKind" AS ENUM ('MARK', 'CORRECTION');

-- CreateEnum
CREATE TYPE "CorrectionSource" AS ENUM ('STAFF', 'TRAINEE');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Center" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "attendanceOverrideReason" TEXT,
ADD COLUMN     "attendancePct" INTEGER;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "minAttendancePct" INTEGER NOT NULL DEFAULT 80;

-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN     "firstMarkedAt" TIMESTAMP(3),
ADD COLUMN     "firstMarkedById" TEXT,
ADD COLUMN     "markedAccuracyM" INTEGER,
ADD COLUMN     "markedDistanceM" INTEGER,
ADD COLUMN     "markedLat" DOUBLE PRECISION,
ADD COLUMN     "markedLng" DOUBLE PRECISION,
ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fromStatus" "AttendanceStatus",
    "toStatus" "AttendanceStatus" NOT NULL,
    "kind" "AttendanceChangeKind" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "correctionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fromStatus" "AttendanceStatus",
    "toStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "source" "CorrectionSource" NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceLog_sessionId_idx" ON "AttendanceLog"("sessionId");

-- CreateIndex
CREATE INDEX "AttendanceLog_personId_idx" ON "AttendanceLog"("personId");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_status_idx" ON "AttendanceCorrection"("status");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_sessionId_idx" ON "AttendanceCorrection"("sessionId");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_personId_idx" ON "AttendanceCorrection"("personId");

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

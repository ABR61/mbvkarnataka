-- AlterEnum
ALTER TYPE "AttendanceChangeKind" ADD VALUE 'SELF_CHECKIN';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkInAccuracyM" INTEGER,
ADD COLUMN     "checkInDistanceM" INTEGER,
ADD COLUMN     "checkInLat" DOUBLE PRECISION,
ADD COLUMN     "checkInLng" DOUBLE PRECISION,
ADD COLUMN     "selfCheckedInAt" TIMESTAMP(3);

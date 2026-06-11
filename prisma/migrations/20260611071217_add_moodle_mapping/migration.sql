-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "moodleCourseId" INTEGER;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "moodleEnrolled" BOOLEAN NOT NULL DEFAULT false;

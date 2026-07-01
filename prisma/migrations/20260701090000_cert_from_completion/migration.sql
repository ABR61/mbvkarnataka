-- Certificate can attach to a Completion (feedback-earned) as well as an Enrollment.
ALTER TABLE "Certificate" ALTER COLUMN "enrollmentId" DROP NOT NULL;
ALTER TABLE "Certificate" ADD COLUMN "completionId" TEXT;
CREATE UNIQUE INDEX "Certificate_completionId_key" ON "Certificate"("completionId");
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_completionId_fkey"
  FOREIGN KEY ("completionId") REFERENCES "Completion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

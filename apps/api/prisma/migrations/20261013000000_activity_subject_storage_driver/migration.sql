ALTER TABLE "activities" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "activities" ADD CONSTRAINT "activities_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "activities_subjectId_idx" ON "activities"("subjectId");
ALTER TABLE "images" ADD COLUMN "storageDriver" TEXT NOT NULL DEFAULT 's3';

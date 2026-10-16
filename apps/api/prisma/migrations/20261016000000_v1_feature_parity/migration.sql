ALTER TYPE "ActivityType" ADD VALUE 'LOGIN';
ALTER TYPE "ActivityType" ADD VALUE 'ACCOUNT_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'TEMP_PASSWORD_ISSUED';
ALTER TYPE "ResourceType" ADD VALUE 'AUTH';
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3);
ALTER TABLE "subjects" ADD COLUMN "descriptionFormat" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "projects" ADD COLUMN "descriptionFormat" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "sections" ADD COLUMN "descriptionFormat" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "tags" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "views" ADD COLUMN "subjectId" TEXT;
CREATE INDEX "tags_subjectId_idx" ON "tags"("subjectId");
CREATE INDEX "views_subjectId_idx" ON "views"("subjectId");
CREATE UNIQUE INDEX "views_userId_subjectId_key" ON "views"("userId", "subjectId");
ALTER TABLE "tags" ADD CONSTRAINT "tags_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "views" ADD CONSTRAINT "views_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `search_vector` on the `pages` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "pages_search_vector_idx";

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "color" TEXT NOT NULL DEFAULT 'emerald',
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'book';

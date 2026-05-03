-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'GUEST');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'COMMENTED', 'REPLIED', 'RESTORED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('PAGE', 'PROJECT', 'SECTION', 'SUBJECT');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('COVER', 'AVATAR', 'INLINE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'GUEST',
    "avatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

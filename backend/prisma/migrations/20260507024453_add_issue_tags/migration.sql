-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateEnum
CREATE TYPE "ConversationSessionStatus" AS ENUM ('GATHERING', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "status" "ConversationSessionStatus" NOT NULL DEFAULT 'GATHERING',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationSession_organizationId_idx" ON "ConversationSession"("organizationId");

-- CreateIndex
CREATE INDEX "ConversationSession_telegramChatId_telegramUserId_status_idx" ON "ConversationSession"("telegramChatId", "telegramUserId", "status");

-- CreateIndex
CREATE INDEX "ConversationSession_expiresAt_idx" ON "ConversationSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

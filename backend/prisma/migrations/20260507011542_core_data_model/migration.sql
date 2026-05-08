/*
  Warnings:

  - You are about to drop the `OrganizationMembership` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('DEMO', 'FREE', 'PRO');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('ORG_ADMIN', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('NEW', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('DASHBOARD', 'PUBLIC_FORM', 'TELEGRAM', 'EMAIL', 'API', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "AiAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('NEUTRAL', 'FRUSTRATED', 'ANGRY', 'CONFUSED', 'URGENT');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('REQUESTER', 'AGENT', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TELEGRAM', 'PUBLIC_FORM', 'EMAIL', 'API');

-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_organizationId_fkey";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "aiUsageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiUsageLimit" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "plan" "OrganizationPlan" NOT NULL DEFAULT 'DEMO';

-- DropTable
DROP TABLE "OrganizationMembership";

-- DropEnum
DROP TYPE "MembershipRole";

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "keycloakUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requester" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "telegramUserId" TEXT,
    "telegramChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requesterId" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalDescription" TEXT NOT NULL,
    "generatedTitle" TEXT,
    "summary" TEXT,
    "category" TEXT,
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "sentiment" "Sentiment",
    "suggestedTeam" TEXT,
    "suggestedResponse" TEXT,
    "sourceChannel" "SourceChannel" NOT NULL DEFAULT 'DASHBOARD',
    "status" "IssueStatus" NOT NULL DEFAULT 'NEW',
    "aiAnalysisStatus" "AiAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueMessage" (
    "id" UUID NOT NULL,
    "issueId" UUID NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderName" TEXT,
    "content" TEXT NOT NULL,
    "sourceChannel" "SourceChannel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "secretCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysisLog" (
    "id" UUID NOT NULL,
    "issueId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "rawResponse" TEXT,
    "parsedResponse" JSONB,
    "status" "AiAnalysisStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysisLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userProfileId" UUID,
    "organizationId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_keycloakUserId_key" ON "UserProfile"("keycloakUserId");

-- CreateIndex
CREATE INDEX "UserProfile_email_idx" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "UserProfile_createdAt_idx" ON "UserProfile"("createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userProfileId_idx" ON "OrganizationMember"("userProfileId");

-- CreateIndex
CREATE INDEX "OrganizationMember_role_idx" ON "OrganizationMember"("role");

-- CreateIndex
CREATE INDEX "OrganizationMember_createdAt_idx" ON "OrganizationMember"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userProfileId_key" ON "OrganizationMember"("organizationId", "userProfileId");

-- CreateIndex
CREATE INDEX "Requester_organizationId_idx" ON "Requester"("organizationId");

-- CreateIndex
CREATE INDEX "Requester_email_idx" ON "Requester"("email");

-- CreateIndex
CREATE INDEX "Requester_telegramUserId_idx" ON "Requester"("telegramUserId");

-- CreateIndex
CREATE INDEX "Requester_createdAt_idx" ON "Requester"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Requester_organizationId_email_key" ON "Requester"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Requester_organizationId_telegramUserId_key" ON "Requester"("organizationId", "telegramUserId");

-- CreateIndex
CREATE INDEX "Issue_organizationId_idx" ON "Issue"("organizationId");

-- CreateIndex
CREATE INDEX "Issue_requesterId_idx" ON "Issue"("requesterId");

-- CreateIndex
CREATE INDEX "Issue_status_idx" ON "Issue"("status");

-- CreateIndex
CREATE INDEX "Issue_priority_idx" ON "Issue"("priority");

-- CreateIndex
CREATE INDEX "Issue_sourceChannel_idx" ON "Issue"("sourceChannel");

-- CreateIndex
CREATE INDEX "Issue_createdAt_idx" ON "Issue"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_organizationId_code_key" ON "Issue"("organizationId", "code");

-- CreateIndex
CREATE INDEX "IssueMessage_issueId_idx" ON "IssueMessage"("issueId");

-- CreateIndex
CREATE INDEX "IssueMessage_senderType_idx" ON "IssueMessage"("senderType");

-- CreateIndex
CREATE INDEX "IssueMessage_sourceChannel_idx" ON "IssueMessage"("sourceChannel");

-- CreateIndex
CREATE INDEX "IssueMessage_createdAt_idx" ON "IssueMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ChannelConnection_organizationId_idx" ON "ChannelConnection"("organizationId");

-- CreateIndex
CREATE INDEX "ChannelConnection_channel_idx" ON "ChannelConnection"("channel");

-- CreateIndex
CREATE INDEX "ChannelConnection_isActive_idx" ON "ChannelConnection"("isActive");

-- CreateIndex
CREATE INDEX "ChannelConnection_createdAt_idx" ON "ChannelConnection"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_organizationId_channel_identifier_key" ON "ChannelConnection"("organizationId", "channel", "identifier");

-- CreateIndex
CREATE INDEX "AiAnalysisLog_issueId_idx" ON "AiAnalysisLog"("issueId");

-- CreateIndex
CREATE INDEX "AiAnalysisLog_provider_idx" ON "AiAnalysisLog"("provider");

-- CreateIndex
CREATE INDEX "AiAnalysisLog_status_idx" ON "AiAnalysisLog"("status");

-- CreateIndex
CREATE INDEX "AiAnalysisLog_createdAt_idx" ON "AiAnalysisLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userProfileId_idx" ON "AuditLog"("userProfileId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requester" ADD CONSTRAINT "Requester_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Requester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueMessage" ADD CONSTRAINT "IssueMessage_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnalysisLog" ADD CONSTRAINT "AiAnalysisLog_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

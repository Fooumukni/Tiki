import { Prisma } from '@prisma/client';

export const issueBaseSelect = {
  id: true,
  organizationId: true,
  requesterId: true,
  code: true,
  title: true,
  originalDescription: true,
  generatedTitle: true,
  summary: true,
  category: true,
  priority: true,
  sentiment: true,
  suggestedTeam: true,
  suggestedResponse: true,
  tags: true,
  sourceChannel: true,
  status: true,
  aiAnalysisStatus: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.IssueSelect;

export type IssueBaseRecord = Prisma.IssueGetPayload<{
  select: typeof issueBaseSelect;
}>;

export const issueDetailSelect = {
  ...issueBaseSelect,
  messages: {
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      senderType: true,
      senderName: true,
      content: true,
      sourceChannel: true,
      createdAt: true,
    },
  },
} satisfies Prisma.IssueSelect;

export type IssueDetailRecord = Prisma.IssueGetPayload<{
  select: typeof issueDetailSelect;
}>;

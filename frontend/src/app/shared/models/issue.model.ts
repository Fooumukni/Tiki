export type IssueStatus = 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SourceChannel = 'DASHBOARD' | 'PUBLIC_FORM' | 'TELEGRAM' | 'EMAIL' | 'API' | 'WHATSAPP';
export type AiAnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type Sentiment = 'NEUTRAL' | 'FRUSTRATED' | 'ANGRY' | 'CONFUSED' | 'URGENT';
export type SenderType = 'REQUESTER' | 'AGENT' | 'SYSTEM' | 'AI';

export interface IssueRequester {
  id: string;
  name: string;
  email: string | null;
}

export interface IssueMessage {
  id: string;
  senderType: SenderType;
  senderName: string | null;
  content: string;
  sourceChannel: SourceChannel;
  createdAt: string;
}

export interface Issue {
  id: string;
  organizationId: string;
  requesterId: string | null;
  code: string;
  title: string;
  originalDescription: string;
  generatedTitle: string | null;
  summary: string | null;
  category: string | null;
  priority: IssuePriority;
  sentiment: Sentiment | null;
  suggestedTeam: string | null;
  suggestedResponse: string | null;
  tags: string[];
  sourceChannel: SourceChannel;
  status: IssueStatus;
  aiAnalysisStatus: AiAnalysisStatus;
  requester: IssueRequester | null;
  messages?: IssueMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface PaginatedIssues {
  items: Issue[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListIssuesQuery {
  status?: IssueStatus;
  priority?: IssuePriority;
  sourceChannel?: SourceChannel;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export interface CreateIssueRequest {
  requesterName: string;
  requesterEmail: string;
  title?: string;
  originalDescription: string;
}

export interface UpdateIssueStatusRequest {
  status: IssueStatus;
}

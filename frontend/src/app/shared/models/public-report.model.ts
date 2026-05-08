export interface CreatePublicIssueRequest {
  requesterName: string;
  requesterEmail: string;
  title: string;
  originalDescription: string;
}

export interface PublicIssueCreatedResponse {
  code: string;
  message: string;
}

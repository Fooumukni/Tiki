import { IssuePriority, Sentiment } from '@prisma/client';
import { IntakeEvaluationInput, IntakeEvaluationResult } from './intake-evaluation.interface';

export const aiProviderToken = Symbol('AI_PROVIDER');

export type SuggestedTeam = 'Backend' | 'Frontend' | 'DevOps' | 'QA' | 'Support' | 'Data' | 'AI' | 'Security' | 'General';

export interface IssueAnalysis {
  generatedTitle: string;
  summary: string;
  category: string;
  priority: IssuePriority;
  sentiment: Sentiment;
  suggestedTeam: SuggestedTeam;
  suggestedResponse: string;
  tags: string[];
}

export interface AnalyzeIssueInput {
  message: string;
}

export interface AiProviderResponse {
  rawResponse: string;
  parsedResponse: IssueAnalysis;
}

export interface AIProvider {
  readonly name: string;
  analyzeIssue(input: AnalyzeIssueInput): Promise<AiProviderResponse>;
  evaluateIntakeConversation(input: IntakeEvaluationInput): Promise<IntakeEvaluationResult>;
}

import { IssuePriority, Sentiment } from '@prisma/client';
import { IssueAnalysis, SuggestedTeam } from '../types/ai-provider.interface';

const suggestedTeams: SuggestedTeam[] = [
  'Backend',
  'Frontend',
  'DevOps',
  'QA',
  'Support',
  'Data',
  'AI',
  'Security',
  'General',
];

export class InvalidAiResponseError extends Error {
  constructor(
    message: string,
    readonly rawResponse: string,
  ) {
    super(message);
  }
}

export function parseIssueAnalysisResponse(rawResponse: string): IssueAnalysis {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawResponse);
  } catch {
    throw new InvalidAiResponseError('AI provider returned invalid JSON', rawResponse);
  }

  return validateIssueAnalysis(parsedValue, rawResponse);
}

export function validateIssueAnalysis(parsedValue: unknown, rawResponse: string): IssueAnalysis {
  if (!isRecord(parsedValue)) {
    throw new InvalidAiResponseError('AI provider returned a non-object JSON value', rawResponse);
  }

  const generatedTitle = readRequiredString(parsedValue, 'generatedTitle', rawResponse);
  const summary = readRequiredString(parsedValue, 'summary', rawResponse);
  const category = readRequiredString(parsedValue, 'category', rawResponse);
  const priority = readIssuePriority(parsedValue.priority, rawResponse);
  const sentiment = readSentiment(parsedValue.sentiment, rawResponse);
  const suggestedTeam = readSuggestedTeam(parsedValue.suggestedTeam, rawResponse);
  const suggestedResponse = readRequiredString(parsedValue, 'suggestedResponse', rawResponse);
  const tags = readTags(parsedValue.tags, rawResponse);

  return {
    generatedTitle,
    summary,
    category,
    priority,
    sentiment,
    suggestedTeam,
    suggestedResponse,
    tags,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  parsedValue: Record<string, unknown>,
  fieldName: string,
  rawResponse: string,
): string {
  const value = parsedValue[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidAiResponseError(`AI provider returned invalid ${fieldName}`, rawResponse);
  }

  return value.trim();
}

function readIssuePriority(value: unknown, rawResponse: string): IssuePriority {
  if (typeof value === 'string' && Object.values(IssuePriority).includes(value as IssuePriority)) {
    return value as IssuePriority;
  }

  throw new InvalidAiResponseError('AI provider returned invalid priority', rawResponse);
}

function readSentiment(value: unknown, rawResponse: string): Sentiment {
  if (typeof value === 'string' && Object.values(Sentiment).includes(value as Sentiment)) {
    return value as Sentiment;
  }

  throw new InvalidAiResponseError('AI provider returned invalid sentiment', rawResponse);
}

function readSuggestedTeam(value: unknown, rawResponse: string): SuggestedTeam {
  if (typeof value === 'string' && suggestedTeams.includes(value as SuggestedTeam)) {
    return value as SuggestedTeam;
  }

  throw new InvalidAiResponseError('AI provider returned invalid suggestedTeam', rawResponse);
}

function readTags(value: unknown, rawResponse: string): string[] {
  if (!Array.isArray(value)) {
    throw new InvalidAiResponseError('AI provider returned invalid tags', rawResponse);
  }

  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag, index, tags) => tag.length > 0 && tags.indexOf(tag) === index)
    .slice(0, 12);
}

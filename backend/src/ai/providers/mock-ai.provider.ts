import { Injectable } from '@nestjs/common';
import { IssuePriority, Sentiment } from '@prisma/client';
import { AIProvider, AiProviderResponse, AnalyzeIssueInput, IssueAnalysis } from '../types/ai-provider.interface';
import { IntakeEvaluationInput, IntakeEvaluationResult } from '../types/intake-evaluation.interface';

@Injectable()
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  analyzeIssue(input: AnalyzeIssueInput): Promise<AiProviderResponse> {
    const analysis = this.buildAnalysis(input.message);

    return Promise.resolve({
      rawResponse: JSON.stringify(analysis),
      parsedResponse: analysis,
    });
  }

  evaluateIntakeConversation(input: IntakeEvaluationInput): Promise<IntakeEvaluationResult> {
    const userMessages = input.conversationHistory.filter((m) => m.role === 'user');

    if (userMessages.length < 2) {
      return Promise.resolve({
        needsMoreInfo: true,
        followUpQuestion: 'Could you provide more details? What application or feature were you using, and what exactly happened?',
      });
    }

    const consolidatedDescription = userMessages.map((m) => m.content).join('\n\n');

    return Promise.resolve({
      needsMoreInfo: false,
      issueDescription: consolidatedDescription,
    });
  }

  private buildAnalysis(message: string): IssueAnalysis {
    const normalizedMessage = message.toLowerCase();
    const isCritical = this.containsAny(normalizedMessage, [
      'production outage',
      'data loss',
      'security breach',
      'system unavailable',
    ]);
    const isHighPriority = isCritical || this.containsAny(normalizedMessage, ['payment failure', 'login blocked']);

    return {
      generatedTitle: this.buildGeneratedTitle(message),
      summary: this.buildSummary(message),
      category: this.resolveCategory(normalizedMessage),
      priority: isCritical ? IssuePriority.CRITICAL : isHighPriority ? IssuePriority.HIGH : IssuePriority.MEDIUM,
      sentiment: isHighPriority ? Sentiment.FRUSTRATED : Sentiment.NEUTRAL,
      suggestedTeam: this.resolveSuggestedTeam(normalizedMessage),
      suggestedResponse:
        'Thank you for reporting this. We will review the issue details and follow up with the next steps.',
      tags: this.buildTags(normalizedMessage),
    };
  }

  private buildGeneratedTitle(message: string): string {
    const firstLine = message.split('\n').find((line) => line.trim().length > 0)?.trim();

    if (!firstLine) {
      return 'Support issue pending review';
    }

    return firstLine.length <= 80 ? firstLine : `${firstLine.slice(0, 77).trim()}...`;
  }

  private buildSummary(message: string): string {
    const compactMessage = message.replace(/\s+/g, ' ').trim();

    if (compactMessage.length <= 240) {
      return compactMessage;
    }

    return `${compactMessage.slice(0, 237).trim()}...`;
  }

  private resolveCategory(normalizedMessage: string): string {
    if (this.containsAny(normalizedMessage, ['login', 'authentication', 'password', 'token'])) {
      return 'Backend / Authentication';
    }

    if (this.containsAny(normalizedMessage, ['payment', 'billing', 'invoice'])) {
      return 'Billing';
    }

    if (this.containsAny(normalizedMessage, ['page', 'button', 'screen', 'layout'])) {
      return 'Frontend';
    }

    return 'General Support';
  }

  private resolveSuggestedTeam(normalizedMessage: string): IssueAnalysis['suggestedTeam'] {
    if (this.containsAny(normalizedMessage, ['security breach', 'token', 'permission'])) {
      return 'Security';
    }

    if (this.containsAny(normalizedMessage, ['login', 'api', 'server', 'database'])) {
      return 'Backend';
    }

    if (this.containsAny(normalizedMessage, ['page', 'button', 'screen', 'layout'])) {
      return 'Frontend';
    }

    if (this.containsAny(normalizedMessage, ['deploy', 'outage', 'system unavailable'])) {
      return 'DevOps';
    }

    return 'General';
  }

  private buildTags(normalizedMessage: string): string[] {
    const tags = ['support'];

    if (this.containsAny(normalizedMessage, ['login', 'authentication'])) {
      tags.push('login', 'authentication');
    }

    if (this.containsAny(normalizedMessage, ['payment', 'billing'])) {
      tags.push('billing');
    }

    if (this.containsAny(normalizedMessage, ['error 500', '500'])) {
      tags.push('error-500');
    }

    return [...new Set(tags)];
  }

  private containsAny(value: string, candidates: string[]): boolean {
    return candidates.some((candidate) => value.includes(candidate));
  }
}

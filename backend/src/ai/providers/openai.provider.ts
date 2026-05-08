import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment.validation';
import { buildIssueAnalysisPrompt } from '../prompts/issue-analysis.prompt';
import { AIProvider, AiProviderResponse, AnalyzeIssueInput } from '../types/ai-provider.interface';
import { IntakeEvaluationInput, IntakeEvaluationResult } from '../types/intake-evaluation.interface';
import { isRecord, parseIssueAnalysisResponse } from '../utils/ai-analysis-validation';

interface OpenAIResponseRequestBody {
  model: string;
  input: string;
  temperature: number;
  text: {
    format: {
      type: 'json_object';
    };
  };
}

@Injectable()
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  async analyzeIssue(input: AnalyzeIssueInput): Promise<AiProviderResponse> {
    const apiKey = this.configService.get('OPENAI_API_KEY', { infer: true });

    if (!apiKey) {
      throw new UnauthorizedException('OPENAI_API_KEY is required when AI_PROVIDER=openai');
    }

    const requestBody: OpenAIResponseRequestBody = {
      model: this.configService.get('OPENAI_MODEL', { infer: true }),
      input: buildIssueAnalysisPrompt(input.message),
      temperature: 0.2,
      text: {
        format: {
          type: 'json_object',
        },
      },
    };
    const responseBody = await this.fetchWithTimeout('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const rawResponse = this.extractResponseText(responseBody);

    return {
      rawResponse,
      parsedResponse: parseIssueAnalysisResponse(rawResponse),
    };
  }

  evaluateIntakeConversation(input: IntakeEvaluationInput): Promise<IntakeEvaluationResult> {
    const userMessages = input.conversationHistory.filter((m) => m.role === 'user');
    const consolidatedDescription = userMessages.map((m) => m.content).join('\n\n');

    return Promise.resolve({
      needsMoreInfo: false,
      issueDescription: consolidatedDescription,
    });
  }

  private async fetchWithTimeout(url: string, requestInit: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.configService.get('AI_TIMEOUT_MS', { infer: true }));

    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
      });
      const responseBody = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}: ${JSON.stringify(responseBody)}`);
      }

      return responseBody;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractResponseText(responseBody: unknown): string {
    if (!isRecord(responseBody)) {
      throw new Error('OpenAI returned an invalid response body');
    }

    if (typeof responseBody.output_text === 'string') {
      return responseBody.output_text;
    }

    const output = responseBody.output;

    if (!Array.isArray(output)) {
      throw new Error('OpenAI response did not include output text');
    }

    const textSegments = output.flatMap((outputItem) => {
      if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
        return [];
      }

      return outputItem.content
        .filter((contentItem): contentItem is Record<string, unknown> => isRecord(contentItem))
        .map((contentItem) => contentItem.text)
        .filter((text): text is string => typeof text === 'string');
    });
    const text = textSegments.join('').trim();

    if (text.length === 0) {
      throw new Error('OpenAI response text was empty');
    }

    return text;
  }
}

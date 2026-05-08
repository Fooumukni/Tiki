import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment.validation';
import { buildIssueAnalysisPrompt } from '../prompts/issue-analysis.prompt';
import { buildIntakeEvaluationPrompt } from '../prompts/intake-evaluation.prompt';
import { AIProvider, AiProviderResponse, AnalyzeIssueInput } from '../types/ai-provider.interface';
import { IntakeEvaluationInput, IntakeEvaluationResult } from '../types/intake-evaluation.interface';
import { isRecord, parseIssueAnalysisResponse } from '../utils/ai-analysis-validation';

interface GeminiGenerateContentRequestBody {
  contents: Array<{
    role: 'user';
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    responseMimeType: 'application/json';
    temperature: number;
  };
}

@Injectable()
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  async analyzeIssue(input: AnalyzeIssueInput): Promise<AiProviderResponse> {
    const apiKey = this.configService.get('GEMINI_API_KEY', { infer: true });

    if (!apiKey) {
      throw new UnauthorizedException('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
    }

    const model = this.configService.get('GEMINI_MODEL', { infer: true });
    const requestBody: GeminiGenerateContentRequestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: buildIssueAnalysisPrompt(input.message),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };
    const responseBody = await this.fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );
    const rawResponse = this.extractResponseText(responseBody);

    return {
      rawResponse,
      parsedResponse: parseIssueAnalysisResponse(rawResponse),
    };
  }

  async evaluateIntakeConversation(input: IntakeEvaluationInput): Promise<IntakeEvaluationResult> {
    const apiKey = this.configService.get('GEMINI_API_KEY', { infer: true });

    if (!apiKey) {
      throw new UnauthorizedException('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
    }

    const model = this.configService.get('GEMINI_MODEL', { infer: true });
    const prompt = buildIntakeEvaluationPrompt(input.conversationHistory);
    const requestBody: GeminiGenerateContentRequestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    };

    const responseBody = await this.fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const rawText = this.extractResponseText(responseBody);
    const parsed: unknown = JSON.parse(rawText);

    if (!isRecord(parsed) || typeof parsed.needsMoreInfo !== 'boolean') {
      throw new Error('Invalid intake evaluation response from Gemini');
    }

    return {
      needsMoreInfo: parsed.needsMoreInfo,
      followUpQuestion: typeof parsed.followUpQuestion === 'string' ? parsed.followUpQuestion : undefined,
      issueDescription: typeof parsed.issueDescription === 'string' ? parsed.issueDescription : undefined,
    };
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
        throw new Error(`Gemini request failed with status ${response.status}: ${JSON.stringify(responseBody)}`);
      }

      return responseBody;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractResponseText(responseBody: unknown): string {
    if (!isRecord(responseBody) || !Array.isArray(responseBody.candidates)) {
      throw new Error('Gemini response did not include candidates');
    }

    const textSegments = responseBody.candidates.flatMap((candidate) => {
      if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
        return [];
      }

      return candidate.content.parts
        .filter((part): part is Record<string, unknown> => isRecord(part))
        .map((part) => part.text)
        .filter((text): text is string => typeof text === 'string');
    });
    const text = textSegments.join('').trim();

    if (text.length === 0) {
      throw new Error('Gemini response text was empty');
    }

    return text;
  }
}

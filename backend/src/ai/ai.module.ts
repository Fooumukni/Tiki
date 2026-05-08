import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAnalysisQueueService, issueAnalysisQueueName } from './ai-analysis-queue.service';
import { AiUsageService } from './ai-usage.service';
import { IssueAnalysisProcessor } from './issue-analysis.processor';
import { IssueAnalysisService } from './issue-analysis.service';
import { GeminiProvider } from './providers/gemini.provider';
import { MockAIProvider } from './providers/mock-ai.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { aiProviderToken, AIProvider } from './types/ai-provider.interface';
import { AiProviderName } from './types/ai-provider-name.enum';

@Module({
  imports: [
    BullModule.registerQueue({
      name: issueAnalysisQueueName,
    }),
  ],
  providers: [
    AiAnalysisQueueService,
    IssueAnalysisService,
    IssueAnalysisProcessor,
    AiUsageService,
    MockAIProvider,
    OpenAIProvider,
    GeminiProvider,
    {
      provide: aiProviderToken,
      inject: [ConfigService, MockAIProvider, OpenAIProvider, GeminiProvider],
      useFactory: (
        configService: ConfigService,
        mockAIProvider: MockAIProvider,
        openAIProvider: OpenAIProvider,
        geminiProvider: GeminiProvider,
      ): AIProvider => {
        const providerName = configService.get<AiProviderName>('AI_PROVIDER', AiProviderName.Mock);

        if (providerName === AiProviderName.OpenAi) {
          return openAIProvider;
        }

        if (providerName === AiProviderName.Gemini) {
          return geminiProvider;
        }

        return mockAIProvider;
      },
    },
  ],
  exports: [AiAnalysisQueueService, IssueAnalysisService, aiProviderToken],
})
export class AiModule {}

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { analyzeIssueJobName, IssueAnalysisJobData, issueAnalysisQueueName } from './ai-analysis-queue.service';
import { IssueAnalysisService } from './issue-analysis.service';

@Injectable()
@Processor(issueAnalysisQueueName)
export class IssueAnalysisProcessor extends WorkerHost {
  constructor(
    private readonly issueAnalysisService: IssueAnalysisService,
    @InjectPinoLogger(IssueAnalysisProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<IssueAnalysisJobData>): Promise<void> {
    if (job.name !== analyzeIssueJobName) {
      this.logger.warn({ jobId: job.id, jobName: job.name }, 'Unknown issue analysis job skipped');
      return;
    }

    this.logger.debug(
      {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        organizationId: job.data.organizationId,
        issueId: job.data.issueId,
        force: job.data.force,
      },
      'Issue analysis job started',
    );

    try {
      await this.issueAnalysisService.analyzeIssue({
        ...job.data,
        attemptNumber: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
      });
      this.logger.debug({ jobId: job.id }, 'Issue analysis job completed');
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          organizationId: job.data.organizationId,
          issueId: job.data.issueId,
        },
        'Issue analysis job failed',
      );
      throw error;
    }
  }
}

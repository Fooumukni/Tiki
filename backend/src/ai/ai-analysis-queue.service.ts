import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export const issueAnalysisQueueName = 'issue-analysis';
export const analyzeIssueJobName = 'analyze-issue';

export interface IssueAnalysisJobData {
  organizationId: string;
  issueId: string;
  force: boolean;
  requestedByUserProfileId?: string;
}

@Injectable()
export class AiAnalysisQueueService {
  constructor(
    @InjectQueue(issueAnalysisQueueName)
    private readonly issueAnalysisQueue: Queue<IssueAnalysisJobData>,
    @InjectPinoLogger(AiAnalysisQueueService.name)
    private readonly logger: PinoLogger,
  ) {}

  async enqueueIssueAnalysis(jobData: Omit<IssueAnalysisJobData, 'force'>): Promise<void> {
    await this.addIssueAnalysisJob(
      {
        ...jobData,
        force: false,
      },
      `issue-analysis-${jobData.organizationId}-${jobData.issueId}-automatic`,
    );
  }

  async retryIssueAnalysis(jobData: Omit<IssueAnalysisJobData, 'force'>): Promise<void> {
    await this.addIssueAnalysisJob(
      {
        ...jobData,
        force: true,
      },
      `issue-analysis-${jobData.organizationId}-${jobData.issueId}-retry-${Date.now()}`,
    );
  }

  private async addIssueAnalysisJob(jobData: IssueAnalysisJobData, jobId: string): Promise<void> {
    const job = await this.issueAnalysisQueue.add(analyzeIssueJobName, jobData, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.debug(
      {
        jobId: job.id,
        organizationId: jobData.organizationId,
        issueId: jobData.issueId,
        force: jobData.force,
      },
      'Issue analysis job enqueued',
    );
  }
}

import { Module } from '@nestjs/common';
import { IssuesModule } from '../issues/issues.module';
import { PublicReportController } from './public-report.controller';
import { PublicReportService } from './public-report.service';

@Module({
  imports: [IssuesModule],
  controllers: [PublicReportController],
  providers: [PublicReportService],
})
export class PublicReportModule {}

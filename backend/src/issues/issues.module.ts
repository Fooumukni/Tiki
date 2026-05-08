import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';

@Module({
  imports: [AiModule, MembershipsModule],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}

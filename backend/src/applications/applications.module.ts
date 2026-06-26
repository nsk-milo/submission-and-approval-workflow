import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { ReviewerController } from './reviewer.controller';

@Module({
  imports: [WorkflowModule, AuditLogModule],
  controllers: [ApplicationsController, ReviewerController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}

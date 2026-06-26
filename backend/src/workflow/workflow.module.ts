import { Module } from '@nestjs/common';
import { WorkflowStateMachine } from './workflow.state-machine';

@Module({
  providers: [WorkflowStateMachine],
  exports: [WorkflowStateMachine],
})
export class WorkflowModule {}

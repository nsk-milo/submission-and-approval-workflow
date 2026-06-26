import { BadRequestException } from '@nestjs/common';

/**
 * Thrown by the WorkflowStateMachine when a requested status transition is not
 * permitted by the workflow rules. Surfaces as HTTP 400 with the documented
 * "Illegal status transition" message.
 */
export class IllegalTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super({
      statusCode: 400,
      message: 'Illegal status transition',
      detail: `Cannot transition from ${from} to ${to}`,
    });
  }
}

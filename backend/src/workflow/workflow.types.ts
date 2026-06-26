import { ApplicationStatus } from '@prisma/client';

/**
 * The set of reviewer decision actions plus the applicant submit/resubmit
 * actions, used to describe an intended transition in human terms.
 */
export type WorkflowAction =
  | 'SUBMIT'
  | 'START_REVIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN'
  | 'RESUBMIT_DRAFT';

export interface TransitionRequest {
  from: ApplicationStatus;
  to: ApplicationStatus;
  /** Whether the actor performing the transition is a reviewer. */
  isReviewer: boolean;
  /** Comment supplied with the action (required for REJECT and RETURN). */
  comment?: string;
}

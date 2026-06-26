import { ForbiddenException, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { IllegalTransitionException } from '../common/exceptions/illegal-transition.exception';
import { CommentRequiredException } from '../common/exceptions/comment-required.exception';
import { TransitionRequest } from './workflow.types';

const S = ApplicationStatus;

/**
 * Single source of truth for the procurement-request workflow. Every status
 * change in the system flows through `assertTransition`; no controller or other
 * service mutates `status` directly. This keeps the rules in one auditable place
 * and makes them straightforward to unit test in isolation.
 *
 * Allowed transitions:
 *   DRAFT                -> SUBMITTED                          (applicant)
 *   SUBMITTED            -> UNDER_REVIEW | APPROVED | REJECTED | RETURNED_FOR_CHANGES (reviewer)
 *   UNDER_REVIEW         -> APPROVED | REJECTED | RETURNED_FOR_CHANGES (reviewer)
 *   RETURNED_FOR_CHANGES -> DRAFT                              (applicant)
 */
@Injectable()
export class WorkflowStateMachine {
  private static readonly TRANSITIONS: Readonly<Record<ApplicationStatus, ApplicationStatus[]>> = {
    [S.DRAFT]: [S.SUBMITTED],
    [S.SUBMITTED]: [S.UNDER_REVIEW, S.APPROVED, S.REJECTED, S.RETURNED_FOR_CHANGES],
    [S.UNDER_REVIEW]: [S.APPROVED, S.REJECTED, S.RETURNED_FOR_CHANGES],
    [S.RETURNED_FOR_CHANGES]: [S.DRAFT],
    [S.APPROVED]: [],
    [S.REJECTED]: [],
  };

  // Target statuses that may only be reached by a reviewer.
  private static readonly REVIEWER_TARGETS: ReadonlySet<ApplicationStatus> = new Set([
    S.UNDER_REVIEW,
    S.APPROVED,
    S.REJECTED,
    S.RETURNED_FOR_CHANGES,
  ]);

  // Target statuses that require an explanatory comment.
  private static readonly COMMENT_REQUIRED: ReadonlySet<ApplicationStatus> = new Set([
    S.REJECTED,
    S.RETURNED_FOR_CHANGES,
  ]);

  /** Pure check: is `to` reachable from `from`? */
  canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
    return WorkflowStateMachine.TRANSITIONS[from]?.includes(to) ?? false;
  }

  /** The statuses reachable from a given status. */
  nextStates(from: ApplicationStatus): ApplicationStatus[] {
    return [...(WorkflowStateMachine.TRANSITIONS[from] ?? [])];
  }

  /**
   * Validates a full transition request, throwing the appropriate HTTP error:
   *   - 400 IllegalTransitionException for a disallowed status change
   *   - 403 ForbiddenException when an applicant attempts a reviewer-only target
   *   - 400 CommentRequiredException when reject/return is missing a comment
   * Returns void on success.
   */
  assertTransition({ from, to, isReviewer, comment }: TransitionRequest): void {
    if (!this.canTransition(from, to)) {
      throw new IllegalTransitionException(from, to);
    }

    if (WorkflowStateMachine.REVIEWER_TARGETS.has(to) && !isReviewer) {
      throw new ForbiddenException('Forbidden');
    }

    if (WorkflowStateMachine.COMMENT_REQUIRED.has(to) && !comment?.trim()) {
      throw new CommentRequiredException(
        to === S.REJECTED ? 'reject' : 'return',
      );
    }
  }
}

import { ForbiddenException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { WorkflowStateMachine } from './workflow.state-machine';
import { IllegalTransitionException } from '../common/exceptions/illegal-transition.exception';
import { CommentRequiredException } from '../common/exceptions/comment-required.exception';

const S = ApplicationStatus;

describe('WorkflowStateMachine', () => {
  let sm: WorkflowStateMachine;

  beforeEach(() => {
    sm = new WorkflowStateMachine();
  });

  describe('canTransition', () => {
    it('allows DRAFT -> SUBMITTED', () => {
      expect(sm.canTransition(S.DRAFT, S.SUBMITTED)).toBe(true);
    });

    it('allows SUBMITTED -> APPROVED', () => {
      expect(sm.canTransition(S.SUBMITTED, S.APPROVED)).toBe(true);
    });

    it('allows UNDER_REVIEW -> REJECTED', () => {
      expect(sm.canTransition(S.UNDER_REVIEW, S.REJECTED)).toBe(true);
    });

    it('allows RETURNED_FOR_CHANGES -> DRAFT', () => {
      expect(sm.canTransition(S.RETURNED_FOR_CHANGES, S.DRAFT)).toBe(true);
    });

    it('rejects APPROVED -> DRAFT', () => {
      expect(sm.canTransition(S.APPROVED, S.DRAFT)).toBe(false);
    });

    it('rejects DRAFT -> APPROVED', () => {
      expect(sm.canTransition(S.DRAFT, S.APPROVED)).toBe(false);
    });

    it('treats terminal states (APPROVED, REJECTED) as having no exits', () => {
      expect(sm.nextStates(S.APPROVED)).toEqual([]);
      expect(sm.nextStates(S.REJECTED)).toEqual([]);
    });
  });

  describe('assertTransition - happy paths', () => {
    it('DRAFT -> SUBMITTED succeeds for an applicant', () => {
      expect(() =>
        sm.assertTransition({ from: S.DRAFT, to: S.SUBMITTED, isReviewer: false }),
      ).not.toThrow();
    });

    it('SUBMITTED -> APPROVED succeeds for a reviewer', () => {
      expect(() =>
        sm.assertTransition({ from: S.SUBMITTED, to: S.APPROVED, isReviewer: true }),
      ).not.toThrow();
    });

    it('SUBMITTED -> REJECTED succeeds for a reviewer with a comment', () => {
      expect(() =>
        sm.assertTransition({
          from: S.SUBMITTED,
          to: S.REJECTED,
          isReviewer: true,
          comment: 'Insufficient documentation',
        }),
      ).not.toThrow();
    });
  });

  describe('assertTransition - illegal transitions (HTTP 400)', () => {
    it('APPROVED -> DRAFT throws IllegalTransitionException', () => {
      expect(() =>
        sm.assertTransition({ from: S.APPROVED, to: S.DRAFT, isReviewer: true }),
      ).toThrow(IllegalTransitionException);
    });

    it('DRAFT -> APPROVED throws IllegalTransitionException', () => {
      expect(() =>
        sm.assertTransition({ from: S.DRAFT, to: S.APPROVED, isReviewer: true }),
      ).toThrow(IllegalTransitionException);
    });
  });

  describe('assertTransition - mandatory comments (HTTP 400)', () => {
    it('REJECT without a comment throws CommentRequiredException', () => {
      expect(() =>
        sm.assertTransition({ from: S.SUBMITTED, to: S.REJECTED, isReviewer: true }),
      ).toThrow(CommentRequiredException);
    });

    it('RETURN without a comment throws CommentRequiredException', () => {
      expect(() =>
        sm.assertTransition({
          from: S.SUBMITTED,
          to: S.RETURNED_FOR_CHANGES,
          isReviewer: true,
          comment: '   ',
        }),
      ).toThrow(CommentRequiredException);
    });
  });

  describe('assertTransition - authorization (HTTP 403)', () => {
    it('an applicant cannot approve (reviewer-only target)', () => {
      expect(() =>
        sm.assertTransition({ from: S.SUBMITTED, to: S.APPROVED, isReviewer: false }),
      ).toThrow(ForbiddenException);
    });

    it('an applicant cannot reject', () => {
      expect(() =>
        sm.assertTransition({
          from: S.SUBMITTED,
          to: S.REJECTED,
          isReviewer: false,
          comment: 'no',
        }),
      ).toThrow(ForbiddenException);
    });
  });
});

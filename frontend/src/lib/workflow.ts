import type { ApplicationStatus, Category } from '@/types';

interface StatusMeta {
  label: string;
  /** Tailwind classes for the status badge. */
  className: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  DRAFT: {
    label: 'Draft',
    className:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  SUBMITTED: {
    label: 'Submitted',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
  },
  APPROVED: {
    label: 'Approved',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
  },
  REJECTED: {
    label: 'Rejected',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900',
  },
  RETURNED_FOR_CHANGES: {
    label: 'Returned for changes',
    className:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900',
  },
};

export const STATUS_FILTERS: { value: ApplicationStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RETURNED_FOR_CHANGES', label: 'Returned' },
];

export const CATEGORIES: Category[] = ['FINANCE', 'PROCUREMENT', 'TRAVEL', 'OPERATIONS'];

export function categoryLabel(category: Category): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

/** An applicant may edit/submit while the request is a DRAFT. */
export function isEditable(status: ApplicationStatus): boolean {
  return status === 'DRAFT';
}

/** An applicant may reopen a returned request back into DRAFT. */
export function isRevisable(status: ApplicationStatus): boolean {
  return status === 'RETURNED_FOR_CHANGES';
}

/** A reviewer may act on requests that are awaiting a decision. */
export function isReviewable(status: ApplicationStatus): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW';
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewerService } from '@/services/applications.service';
import type { ApplicationStatus } from '@/types';

const keys = {
  queue: (status?: ApplicationStatus, search?: string) =>
    ['reviewer', 'queue', status ?? 'ALL', search ?? ''] as const,
  detail: (id: string) => ['reviewer', 'detail', id] as const,
};

export function useReviewerQueue(filters: { status?: ApplicationStatus; search?: string }) {
  return useQuery({
    queryKey: keys.queue(filters.status, filters.search),
    queryFn: () => reviewerService.list(filters),
  });
}

export function useReviewerApplication(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => reviewerService.get(id),
    enabled: Boolean(id),
  });
}

type ReviewAction = 'approve' | 'reject' | 'return';

export function useReviewAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, comment }: { action: ReviewAction; comment?: string }) => {
      if (action === 'approve') return reviewerService.approve(id, comment);
      if (action === 'reject') return reviewerService.reject(id, comment ?? '');
      return reviewerService.returnForChanges(id, comment ?? '');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: ['reviewer', 'queue'] });
    },
  });
}

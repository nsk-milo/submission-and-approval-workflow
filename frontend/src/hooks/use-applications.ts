'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '@/services/applications.service';
import type { ApplicationInput } from '@/types';

const keys = {
  mine: ['applications', 'mine'] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
};

export function useMyApplications() {
  return useQuery({ queryKey: keys.mine, queryFn: applicationsService.listMine });
}

export function useMyApplication(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => applicationsService.getMine(id),
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplicationInput) => applicationsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.mine }),
  });
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ApplicationInput>) => applicationsService.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mine });
      qc.invalidateQueries({ queryKey: keys.detail(id) });
    },
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsService.submit(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.mine });
      qc.invalidateQueries({ queryKey: keys.detail(id) });
    },
  });
}

export function useReviseApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsService.revise(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.mine });
      qc.invalidateQueries({ queryKey: keys.detail(id) });
    },
  });
}

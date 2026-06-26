import { api } from '@/lib/api';
import type {
  Application,
  ApplicationDetail,
  ApplicationInput,
  ApplicationStatus,
} from '@/types';

/** Applicant-facing API calls. */
export const applicationsService = {
  listMine(): Promise<Application[]> {
    return api.get<Application[]>('/applications/my').then((r) => r.data);
  },

  getMine(id: string): Promise<ApplicationDetail> {
    return api.get<ApplicationDetail>(`/applications/${id}`).then((r) => r.data);
  },

  create(input: ApplicationInput): Promise<Application> {
    return api.post<Application>('/applications', input).then((r) => r.data);
  },

  update(id: string, input: Partial<ApplicationInput>): Promise<Application> {
    return api.put<Application>(`/applications/${id}`, input).then((r) => r.data);
  },

  submit(id: string): Promise<Application> {
    return api.post<Application>(`/applications/${id}/submit`).then((r) => r.data);
  },

  revise(id: string): Promise<Application> {
    return api.post<Application>(`/applications/${id}/revise`).then((r) => r.data);
  },
};

/** Reviewer-facing API calls. */
export const reviewerService = {
  list(params?: { status?: ApplicationStatus; search?: string }): Promise<Application[]> {
    return api
      .get<Application[]>('/reviewer/applications', { params })
      .then((r) => r.data);
  },

  get(id: string): Promise<ApplicationDetail> {
    return api.get<ApplicationDetail>(`/reviewer/applications/${id}`).then((r) => r.data);
  },

  approve(id: string, comment?: string): Promise<Application> {
    return api
      .post<Application>(`/reviewer/applications/${id}/approve`, { comment })
      .then((r) => r.data);
  },

  reject(id: string, comment: string): Promise<Application> {
    return api
      .post<Application>(`/reviewer/applications/${id}/reject`, { comment })
      .then((r) => r.data);
  },

  returnForChanges(id: string, comment: string): Promise<Application> {
    return api
      .post<Application>(`/reviewer/applications/${id}/return`, { comment })
      .then((r) => r.data);
  },
};

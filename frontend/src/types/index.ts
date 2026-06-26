export type Role = 'APPLICANT' | 'REVIEWER';

export type Category = 'FINANCE' | 'PROCUREMENT' | 'TRAVEL' | 'OPERATIONS';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_CHANGES';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Application {
  id: string;
  title: string;
  category: Category;
  description?: string | null;
  amount: string; // Prisma Decimal is serialized as a string
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: AuthUser;
}

export interface AuditLogEntry {
  id: string;
  applicationId: string;
  performedById: string;
  oldStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  comment: string | null;
  createdAt: string;
  performedBy?: AuthUser;
}

export interface ApplicationDetail extends Application {
  auditTrail: AuditLogEntry[];
}

export interface ApplicationInput {
  title: string;
  category: Category;
  description?: string;
  amount: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  detail?: string;
}

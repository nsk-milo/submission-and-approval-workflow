import { Injectable } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RecordTransitionInput {
  applicationId: string;
  performedById: string;
  oldStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  comment?: string | null;
}

/**
 * Append-only audit trail. The service only ever creates rows — there is no
 * update or delete path — so the history is immutable by construction.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append one audit record. Accepts an optional Prisma transaction client so
   * the status change and its audit row are written atomically.
   */
  record(input: RecordTransitionInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        applicationId: input.applicationId,
        performedById: input.performedById,
        oldStatus: input.oldStatus,
        newStatus: input.newStatus,
        comment: input.comment ?? null,
      },
    });
  }

  /** Full chronological history for an application (oldest first). */
  findForApplication(applicationId: string) {
    return this.prisma.auditLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
      include: {
        performedBy: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  }
}

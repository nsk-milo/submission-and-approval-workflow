import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Application, ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStateMachine } from '../workflow/workflow.state-machine';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';

const APPLICANT_INCLUDE = {
  createdBy: { select: { id: true, email: true, name: true, role: true } },
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowStateMachine,
    private readonly audit: AuditLogService,
  ) {}

  // ---------------------------------------------------------------------------
  // Applicant operations
  // ---------------------------------------------------------------------------

  async create(user: AuthUser, dto: CreateApplicationDto): Promise<Application> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          title: dto.title,
          category: dto.category,
          description: dto.description,
          amount: dto.amount,
          status: ApplicationStatus.DRAFT,
          createdById: user.id,
        },
      });

      // Seed the audit trail with the creation event (null -> DRAFT).
      await this.audit.record(
        {
          applicationId: application.id,
          performedById: user.id,
          oldStatus: null,
          newStatus: ApplicationStatus.DRAFT,
          comment: 'Draft created.',
        },
        tx,
      );

      return application;
    });
  }

  findMine(userId: string) {
    return this.prisma.application.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Detail visible to its owner (applicant), including the audit timeline. */
  async findOneForApplicant(id: string, user: AuthUser) {
    const application = await this.getOrThrow(id);
    if (application.createdById !== user.id) {
      throw new ForbiddenException('Forbidden');
    }
    return this.withAuditTrail(id);
  }

  async update(id: string, user: AuthUser, dto: UpdateApplicationDto): Promise<Application> {
    const application = await this.getOrThrow(id);

    if (application.createdById !== user.id) {
      throw new ForbiddenException('Forbidden');
    }
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT applications can be edited');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      },
    });
  }

  /** Applicant submits a DRAFT for review. */
  submit(id: string, user: AuthUser) {
    return this.performTransition(id, user, ApplicationStatus.SUBMITTED, {
      requireOwner: true,
      isReviewer: false,
    });
  }

  /**
   * Applicant pulls a RETURNED_FOR_CHANGES application back to DRAFT so it can
   * be edited and resubmitted. Implements the RETURNED_FOR_CHANGES -> DRAFT edge.
   */
  revise(id: string, user: AuthUser) {
    return this.performTransition(id, user, ApplicationStatus.DRAFT, {
      requireOwner: true,
      isReviewer: false,
      comment: 'Reopened for changes.',
    });
  }

  // ---------------------------------------------------------------------------
  // Reviewer operations
  // ---------------------------------------------------------------------------

  /** Queue of applications for reviewers, with optional status filter / search. */
  reviewerList(query: QueryApplicationsDto) {
    return this.prisma.application.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? { title: { contains: query.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: APPLICANT_INCLUDE,
    });
  }

  async findOneForReviewer(id: string) {
    await this.getOrThrow(id);
    return this.withAuditTrail(id);
  }

  approve(id: string, user: AuthUser, comment?: string) {
    return this.performTransition(id, user, ApplicationStatus.APPROVED, {
      isReviewer: true,
      comment,
    });
  }

  reject(id: string, user: AuthUser, comment: string) {
    return this.performTransition(id, user, ApplicationStatus.REJECTED, {
      isReviewer: true,
      comment,
    });
  }

  returnForChanges(id: string, user: AuthUser, comment: string) {
    return this.performTransition(id, user, ApplicationStatus.RETURNED_FOR_CHANGES, {
      isReviewer: true,
      comment,
    });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Validates a transition via the WorkflowStateMachine, then atomically writes
   * the new status and an audit record. This is the only place `status` is
   * mutated, so every status change is guaranteed to be both legal and audited.
   */
  private async performTransition(
    id: string,
    user: AuthUser,
    to: ApplicationStatus,
    opts: { isReviewer: boolean; requireOwner?: boolean; comment?: string },
  ) {
    const application = await this.getOrThrow(id);

    if (opts.requireOwner && application.createdById !== user.id) {
      throw new ForbiddenException('Forbidden');
    }

    // Throws 400 (illegal / missing comment) or 403 (role) as appropriate.
    this.workflow.assertTransition({
      from: application.status,
      to,
      isReviewer: opts.isReviewer,
      comment: opts.comment,
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status: to },
      });

      await this.audit.record(
        {
          applicationId: id,
          performedById: user.id,
          oldStatus: application.status,
          newStatus: to,
          comment: opts.comment ?? null,
        },
        tx,
      );

      return updated;
    });
  }

  private async getOrThrow(id: string): Promise<Application> {
    const application = await this.prisma.application.findUnique({ where: { id } });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  private async withAuditTrail(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: APPLICANT_INCLUDE,
    });
    const auditTrail = await this.audit.findForApplication(id);
    return { ...application, auditTrail };
  }
}

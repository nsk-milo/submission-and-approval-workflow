import { PrismaClient, Role, Category, ApplicationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 10);

  const applicant = await prisma.user.upsert({
    where: { email: 'applicant@example.com' },
    update: {},
    create: {
      email: 'applicant@example.com',
      passwordHash,
      role: Role.APPLICANT,
      name: 'nKANDU Applicant',
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: {},
    create: {
      email: 'reviewer@example.com',
      passwordHash,
      role: Role.REVIEWER,
      name: 'Mora Reviewer',
    },
  });

  // A couple of sample procurement requests so the UI is not empty on first run.
  const existing = await prisma.application.count({ where: { createdById: applicant.id } });
  if (existing === 0) {
    const draft = await prisma.application.create({
      data: {
        title: 'New laptops for design team',
        category: Category.PROCUREMENT,
        description: 'Procurement request for 5 developer laptops.',
        amount: '12500.00',
        status: ApplicationStatus.DRAFT,
        createdById: applicant.id,
      },
    });

    const submitted = await prisma.application.create({
      data: {
        title: 'Office furniture refresh',
        category: Category.OPERATIONS,
        description: 'Standing desks and ergonomic chairs.',
        amount: '8200.00',
        status: ApplicationStatus.SUBMITTED,
        createdById: applicant.id,
      },
    });

    // Seed the audit trail for the submitted request: DRAFT -> SUBMITTED.
    await prisma.auditLog.create({
      data: {
        applicationId: submitted.id,
        performedById: applicant.id,
        oldStatus: ApplicationStatus.DRAFT,
        newStatus: ApplicationStatus.SUBMITTED,
        comment: 'Submitted for review.',
      },
    });

    // Mark draft creation in the audit trail too (oldStatus null = created).
    await prisma.auditLog.create({
      data: {
        applicationId: draft.id,
        performedById: applicant.id,
        oldStatus: null,
        newStatus: ApplicationStatus.DRAFT,
        comment: 'Draft created.',
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  Applicant: ${applicant.email} / Password123`);
  console.log(`  Reviewer:  ${reviewer.email} / Password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

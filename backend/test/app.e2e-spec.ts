import { INestApplication, BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Full HTTP integration tests. Requires a running Postgres (DATABASE_URL) with
 * migrations applied and the seed users present:
 *   applicant@example.com / Password123
 *   reviewer@example.com  / Password123
 *
 *   docker compose up -d postgres
 *   npm run prisma:migrate && npm run prisma:seed
 *   npm run test:e2e
 */
describe('PACRA workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let applicantToken: string;
  let reviewerToken: string;
  let applicationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          const fieldErrors: Record<string, string[]> = {};
          for (const e of errors) fieldErrors[e.property] = Object.values(e.constraints ?? {});
          return new BadRequestException({
            statusCode: 400,
            message: 'Validation failed',
            errors: fieldErrors,
          });
        },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in the applicant and returns an access token + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'applicant@example.com', password: 'Password123' })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('APPLICANT');
    applicantToken = res.body.accessToken;
  });

  it('logs in the reviewer', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'reviewer@example.com', password: 'Password123' })
      .expect(200);

    expect(res.body.user.role).toBe('REVIEWER');
    reviewerToken = res.body.accessToken;
  });

  it('rejects bad credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'applicant@example.com', password: 'wrong' })
      .expect(401);
  });

  it('creates a draft application for the applicant', async () => {
    const res = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'E2E procurement request',
        category: 'PROCUREMENT',
        description: 'Test request',
        amount: 1500.5,
      })
      .expect(201);

    expect(res.body.status).toBe('DRAFT');
    applicationId = res.body.id;
  });

  it('rejects an invalid create payload with 400 + validation errors', async () => {
    const res = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ title: '', category: 'NOPE', amount: -5 })
      .expect(400);

    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeDefined();
  });

  it('enforces field-level rules (short title, short description, oversized & non-monetary amount)', async () => {
    const cases: Array<{ payload: Record<string, unknown>; field: string }> = [
      { payload: { title: 'abc', category: 'FINANCE', description: 'long enough description', amount: 10 }, field: 'title' },
      { payload: { title: 'Valid title', category: 'FINANCE', description: 'too short', amount: 10 }, field: 'description' },
      { payload: { title: 'Valid title', category: 'FINANCE', description: 'long enough description', amount: 20000000 }, field: 'amount' },
      { payload: { title: 'Valid title', category: 'FINANCE', description: 'long enough description', amount: 10.999 }, field: 'amount' },
    ];

    for (const { payload, field } of cases) {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send(payload)
        .expect(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors[field]).toBeDefined();
    }
  });

  it('submits the draft (DRAFT -> SUBMITTED)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/applications/${applicationId}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .expect(200);

    expect(res.body.status).toBe('SUBMITTED');
  });

  it('forbids an applicant from approving (403)', async () => {
    await request(app.getHttpServer())
      .post(`/reviewer/applications/${applicationId}/approve`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .expect(403);
  });

  it('forbids a reviewer from editing a draft/application (403)', async () => {
    await request(app.getHttpServer())
      .put(`/applications/${applicationId}`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ title: 'hacked' })
      .expect(403);
  });

  it('returns 400 when rejecting without a comment', async () => {
    const res = await request(app.getHttpServer())
      .post(`/reviewer/applications/${applicationId}/reject`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({})
      .expect(400);

    expect(res.body.statusCode).toBe(400);
  });

  it('approves the submitted application (SUBMITTED -> APPROVED)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/reviewer/applications/${applicationId}/approve`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({})
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
  });

  it('returns 400 on an illegal transition (approving an APPROVED application)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/reviewer/applications/${applicationId}/approve`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({})
      .expect(400);

    expect(res.body.message).toBe('Illegal status transition');
  });

  it('exposes the audit trail in chronological order on the detail view', async () => {
    const res = await request(app.getHttpServer())
      .get(`/reviewer/applications/${applicationId}`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .expect(200);

    const trail = res.body.auditTrail;
    expect(Array.isArray(trail)).toBe(true);
    // created -> submitted -> approved
    expect(trail[trail.length - 1].newStatus).toBe('APPROVED');
  });

  it('requires authentication (401 without a token)', async () => {
    await request(app.getHttpServer()).get('/applications/my').expect(401);
  });

  afterAll(async () => {
    if (applicationId) {
      await prisma.auditLog.deleteMany({ where: { applicationId } });
      await prisma.application.deleteMany({ where: { id: applicationId } });
    }
  });
});

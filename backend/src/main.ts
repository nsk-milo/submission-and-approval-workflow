import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe, ValidationError } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Flattens class-validator errors into { field: [messages] } so the global
 * filter can emit the documented validation-error envelope.
 */
function buildValidationException(errors: ValidationError[]) {
  const fieldErrors: Record<string, string[]> = {};
  for (const error of errors) {
    fieldErrors[error.property] = Object.values(error.constraints ?? {});
  }
  return new BadRequestException({
    statusCode: 400,
    message: 'Validation failed',
    errors: fieldErrors,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: buildValidationException,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const configuredOrigins = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Explicit CORS middleware (more predictable than the default cors() wiring
  // in this setup). We always allow the configured origins plus any
  // localhost/127.0.0.1 origin — so the Next dev server works on whatever port
  // it lands on (3000, 3001, …) whether the API runs locally or in Docker. The
  // exact origin is reflected, as required alongside credentials (a wildcard is
  // invalid with credentials).
  const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  const isAllowedOrigin = (origin?: string): origin is string => {
    if (!origin) return false;
    return configuredOrigins.includes(origin) || localhostPattern.test(origin);
  };

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        (req.headers['access-control-request-headers'] as string) ||
          'Content-Type, Authorization',
      );
    }
    // Short-circuit CORS preflight requests.
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  console.log(`PACRA API listening on http://localhost:${port}`);
}

bootstrap();

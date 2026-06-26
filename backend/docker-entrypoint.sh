#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
node dist/prisma/seed.js || echo "Seed skipped (already seeded or unavailable)."

echo "Starting PACRA API..."
node dist/src/main.js

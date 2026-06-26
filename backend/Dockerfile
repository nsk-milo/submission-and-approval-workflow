# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl libc6-compat

# Install dependencies (including dev) for building and prisma generate.
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Precompile the seed script to plain JS so it can run without ts-node at runtime.
RUN npx tsc prisma/seed.ts --outDir dist/prisma \
    --module commonjs --esModuleInterop --skipLibCheck --target ES2021 \
    --moduleResolution node --resolveJsonModule

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Entrypoint applies migrations + seed, then launches the API.
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]

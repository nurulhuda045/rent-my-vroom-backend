# ---------- Base image ----------
FROM node:22-alpine AS base

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

# ---------- Build ----------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# ---------- Production ----------
FROM base AS production

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

# Install only production dependencies
RUN npm install --omit=dev

# # Copy generated Prisma client
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy build output
COPY --from=builder /app/dist ./dist

# Generate Prisma client again before app start
RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && node dist/main"]
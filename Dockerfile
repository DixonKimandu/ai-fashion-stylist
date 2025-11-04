# Multi-stage build for optimized image size

# Stage 1: Install dependencies and build Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production image with Next.js standalone output
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Cloud Run provides PORT; Next respects it via start script
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]


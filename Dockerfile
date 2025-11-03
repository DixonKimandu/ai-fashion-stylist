# Multi-stage build for optimized image size

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build-time arguments for embedding into the client bundle
ARG GEMINI_API_KEY
ARG GCS_BUCKET_NAME
ARG GCS_INVENTORY_PATH

# Expose args to the build environment so Vite can read them
ENV GEMINI_API_KEY=$GEMINI_API_KEY \
    GCS_BUCKET_NAME=$GCS_BUCKET_NAME \
    GCS_INVENTORY_PATH=$GCS_INVENTORY_PATH

# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy server script
COPY server.js ./

# Expose port (Cloud Run will set PORT env variable)
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]


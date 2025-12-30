# GhostWebSurfer Dockerfile
# Multi-stage build for optimized image size

FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS base

# Set working directory
WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Create output directory for logs
RUN mkdir -p /app/output

# Set environment variables with defaults
ENV TARGET_URL=https://google.com/ \
    TOTAL_USERS=5 \
    CONCURRENCY=5 \
    WAIT_MS=2000 \
    LOG_FILE=/app/output/output-log.txt \
    PAGE_LOAD_TIMEOUT_MS=60000 \
    OUTPUT_MODE=file \
    NODE_ENV=production

# Run as non-root user for security
USER pwuser

# Volume for output logs
VOLUME ["/app/output"]

# Default command
CMD ["node", "simulate-users.js"]

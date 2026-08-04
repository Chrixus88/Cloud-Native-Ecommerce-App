# =========================
# Builder Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source
COPY . .


# =========================
# Production Stage
# =========================
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Create non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copy only runtime files
COPY --from=builder --chown=appuser:appgroup /app/server.js ./
COPY --from=builder --chown=appuser:appgroup /app/app.js ./
COPY --from=builder --chown=appuser:appgroup /app/config ./config
COPY --from=builder --chown=appuser:appgroup /app/controllers ./controllers
COPY --from=builder --chown=appuser:appgroup /app/database ./database
COPY --from=builder --chown=appuser:appgroup /app/healthcheck ./healthcheck
COPY --from=builder --chown=appuser:appgroup /app/helpers ./helpers
COPY --from=builder --chown=appuser:appgroup /app/middleware ./middleware
COPY --from=builder --chown=appuser:appgroup /app/models ./models
COPY --from=builder --chown=appuser:appgroup /app/routes ./routes
COPY --from=builder --chown=appuser:appgroup /app/uploads ./uploads
COPY --from=builder --chown=appuser:appgroup /app/utils ./utils
COPY --from=builder --chown=appuser:appgroup /app/validators ./validators

# Switch to non-root user
USER appuser

# Application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
CMD ["node", "healthcheck/healthcheck.js"]

# Start application
CMD ["npm", "start"]


